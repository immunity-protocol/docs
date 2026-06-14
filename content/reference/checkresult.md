---
title: "CheckResult"
order: 3
description: "Every field on the object returned by immunity.check(). What populates each field at each tier."
---

# `CheckResult`

What `immunity.check()` returns.

```ts
interface CheckResult {
  allowed: boolean;
  decision: "allow" | "block" | "escalate";
  source: "cache" | "registry" | "tee" | "policy";
  confidence: number;
  antibodies: Antibody[];
  reason: string;
  checkId: Hex32 | null;
  novel: boolean;
  txFacts: TxFacts;
  pendingWrite?: Promise<PublishResult | null>;
}
```

## Fields

### `allowed`

Type: `boolean`. The only field your control flow needs. `true`, proceed; `false`, do not. `if (!result.allowed) return;` is the canonical pattern.

### `decision`

Type: `"allow" | "block" | "escalate"`.

- `"allow"`, no enforcing antibody matched and any verifier verdict was benign.
- `"block"`, a hard-block match fired, or the verifier returned a block verdict, or an advisory match under `block` policy.
- `"escalate"`, a SUSPICIOUS verdict in the escalate band, where `onEscalate` returned `false` or timed out with `onTimeout: "deny"`.

`allowed === (decision === "allow")` is invariant.

### `source`

Type: `"cache" | "registry" | "tee" | "policy"`. Which tier resolved the check.

| `source` | Tier | Meaning |
|---|---|---|
| `"cache"` | Tier 1 | matched in the local cache |
| `"registry"` | Tier 2 | cache miss + on-chain matcher hit |
| `"tee"` | Tier 3 | cache + chain miss, CRE verdict fired |
| `"policy"` | none | no match; `trust-cache` or `deny-novel` decided |

See [Three-tier lookup](/concepts/three-tier-lookup/).

### `confidence`

Type: `number`, 0..100. Highest confidence among matched antibodies, or the CRE-returned confidence when Tier 3 fired. `0` for `source: "policy"`.

### `antibodies`

Type: `Antibody[]`. Matched antibodies; multiple are possible (an ADDRESS and a CALL_PATTERN can both fire). Empty for an allow. The first element is the primary match. See [Antibody](/reference/antibody/).

### `reason`

Type: `string`. Human-readable summary. **Do not branch on it**, branch on `allowed`, `decision`, or `source`. For logs and operator UI.

### `checkId`

Type: `Hex32 | null`. The on-chain settlement transaction hash, or `null` when the SDK made no on-chain call (a `trust-cache`/`deny-novel` policy decision, or a degraded path). `null` is not a bug; it signals the chain was not needed.

### `novel`

Type: `boolean`. `true` only when the result is an `allow` from a cache miss with no verification, i.e. `decision: "allow"`, `source: "policy"`, under `trust-cache`. Useful for queuing novel-but-allowed actions for batch review.

### `txFacts`

Type: `TxFacts`. The SDK's extracted view of the proposed tx, submitted on chain for the indexer's value-at-risk pricing:

```ts
interface TxFacts {
  tokenAddress: Address;   // 0x0...0 if none detected
  tokenAmount: bigint;     // 0 if none
  originChainId: number;   // 0 if not derivable
}
```

All-zero is legitimate (a `null` tx, or unrecognized calldata). Read-only; operators cannot override it.

### `pendingWrite`

Type: `Promise<PublishResult | null>` (optional). Present **only** when the auto-publish seam fired: `autoPublishConfirmedThreats` is on, the wallet is registered, and a Tier-3 verdict confirmed a threat. It resolves to the `PublishResult`, or `null` if skipped (not registered / balance short) or if it failed (the failure is logged and never affects the decision). A one-shot agent can `await result.pendingWrite` before exiting; long-lived agents ignore it.

## Example uses

### Audit logging

```ts
log.info({
  decision: result.decision,
  source: result.source,
  confidence: result.confidence,
  immId: result.antibodies[0]?.immId,
  checkId: result.checkId,
  novel: result.novel,
}, "immunity.check");
```

### Treating "novel" specially

```ts
if (result.allowed && result.novel) {
  await batchReviewQueue.enqueue({ tx, txFacts: result.txFacts });
}
```

### Awaiting an auto-published antibody

```ts
const result = await immunity.check(tx, ctx);
const published = await result.pendingWrite;   // PublishResult | null | undefined
if (published) console.log(`auto-published ${published.immId}`);
```

## See also

- **[Immunity class](/reference/immunity-class/)**, the methods that produce this result.
- **[Antibody](/reference/antibody/)**, the shape of items in `result.antibodies`.
- **[Three-tier lookup](/concepts/three-tier-lookup/)**, the `source` field demystified.
