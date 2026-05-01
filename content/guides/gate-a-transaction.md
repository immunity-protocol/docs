---
title: "Gate a transaction"
order: 1
description: "Production-grade pattern for wrapping every wallet.sendTransaction() with an immunity.check() call."
---

# Gate a transaction

The canonical agent integration. Wrap every action that calls `wallet.sendTransaction()` with `immunity.check()`. If `check()` blocks, do not sign.

## The minimal pattern

```ts
async function safeSend(tx: ProposedTx, ctx: CheckContext) {
  const result = await immunity.check(tx, ctx);
  if (!result.allowed) {
    throw new ImmunityBlockedError(result);
  }
  return wallet.sendTransaction(tx);
}
```

That's the whole gate. Everything below is hardening for production: error taxonomy, retries, audit logs, observability.

## Production-grade version

```ts
import { Immunity, type CheckContext, type ProposedTx, type CheckResult } from "@immunity-protocol/sdk";
import { Wallet } from "ethers";
import { logger } from "./logger.js";  // your structured logger

class ImmunityBlockedError extends Error {
  constructor(public readonly result: CheckResult) {
    super(`Blocked by ${result.antibodies[0]?.immId ?? "unknown"}: ${result.reason}`);
    this.name = "ImmunityBlockedError";
  }
}

async function safeSend(
  immunity: Immunity,
  wallet: Wallet,
  tx: ProposedTx,
  ctx: CheckContext,
) {
  const startedAt = Date.now();
  let result: CheckResult;

  try {
    result = await immunity.check(tx, ctx);
  } catch (err) {
    // Network/RPC failures, malformed inputs. Fail-closed by default.
    logger.error({ err, tx }, "immunity.check threw");
    throw err;
  }

  logger.info({
    decision: result.decision,
    source: result.source,
    confidence: result.confidence,
    novel: result.novel,
    immId: result.antibodies[0]?.immId,
    checkId: result.checkId,
    durationMs: Date.now() - startedAt,
  }, "immunity.check");

  if (!result.allowed) {
    throw new ImmunityBlockedError(result);
  }

  return wallet.sendTransaction(tx);
}
```

## What context to pass

`check()` takes a `CheckContext` with all-optional fields. Pass everything you have:

```ts
const ctx: CheckContext = {
  // The recent conversation. Drives the SEMANTIC matchers and the TEE.
  conversation: lastNTurns(history, 10),

  // Any tool calls that produced data feeding into this action.
  // Lets the SDK trace prompt-injection attempts back to a tool.
  toolTrace: recentToolCalls(),

  // Documents, web pages, scraped content the agent based the action on.
  sources: cited.map(s => ({ kind: "url", value: s.url, summary: s.snippet })),

  // The counterparty if it has a stable identity.
  counterparty: { id: tx.to, ens: ensCacheLookup(tx.to) },

  // Anything else that might help triage. Free-form.
  metadata: { workflow: "treasury-rebalance", initiator: agentId },
};
```

The richer the context, the better the SEMANTIC matchers and the TEE can reason. SDK throws nothing on missing context; sparse context just narrows the matchable surface.

## Error taxonomy

| Error class | Code | What it means | What to do |
|---|---|---|---|
| `ImmunityBlockedError` (custom) | n/a | check returned not-allowed | log and abort, do not retry |
| `MissingConfigError` | `ERR_MISSING_CONFIG` | construction missing wallet or axlUrl | fix config |
| `NotStartedError` | `ERR_NOT_STARTED` | called check before start | call `start()` first |
| `InsufficientBalanceError` | `ERR_INSUFFICIENT_BALANCE` | prepaid USDC balance below the fee | call `deposit()` |
| `NetworkError` | `ERR_NETWORK` | RPC or AXL unreachable | retry with backoff |
| `TeeAttestationError` | `ERR_TEE_ATTESTATION` | TEE response failed verification | one retry, then degrade to `trust-cache` |
| `TeeResponseError` | `ERR_TEE_RESPONSE` | TEE returned a malformed verdict | log and degrade to `trust-cache` |

Errors extend `ImmunityError` so a single `instanceof` check covers SDK-internal failures.

## Retry semantics

`check()` is **idempotent at the protocol level**. Calling it twice with the same input produces two settlement txs (you pay twice) but does not double-publish on TEE-driven mints (the SDK preflights the matcher hash before publishing).

For transient failures (RPC drops, AXL hiccups, TEE timeouts), retry once after a 1-2 second backoff. For consistent failures, fail closed (block the action).

## Performance

Cache hits return synchronously from in-memory matchers in around 1 ms. Registry hits round-trip the chain in ~200 ms. TEE calls take ~3 s. If your agent's action latency budget cannot tolerate ~3 s on novel threats, set `novelThreatPolicy: "deny-novel"` for that code path or call with `options.policy: "deny-novel"`:

```ts
const result = await immunity.check(tx, ctx, { policy: "deny-novel" });
```

The override takes precedence over the configured default for that single call.

## Audit logs

Persist every `check()` result. The fields you care about are deterministic and small:

```ts
logRow({
  ts: new Date().toISOString(),
  agentId,
  txTo: tx.to,
  txValue: tx.value?.toString(),
  decision: result.decision,
  source: result.source,
  confidence: result.confidence,
  immId: result.antibodies[0]?.immId,
  checkId: result.checkId,           // null on policy short-circuits
  reasonHash: hash(result.reason),    // hash, not free text, for compactness
});
```

`checkId` is the on-chain settlement tx hash. Cross-reference with the Registry's `CheckSettled` event log for the canonical record.

## See also

- **[Operator in the loop](/guides/operator-in-the-loop/)**, when SUSPICIOUS verdicts need a human.
- **[Reference: CheckResult](/reference/checkresult/)**, every field explained.
- **[Reference: Errors](/reference/errors/)**, the full taxonomy.
