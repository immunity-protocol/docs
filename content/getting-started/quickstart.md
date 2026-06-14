---
title: "Quickstart"
order: 2
description: "A short agent that imports the SDK, gates a transaction with check(), and decides whether to sign."
---

# Quickstart

This is the smallest agent that uses Immunity correctly. Copy it, set one env var, fund the wallet, run it, watch the network respond.

## The full example

```ts
import { Immunity, parseUsdc, BASE_SEPOLIA } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

// 1. Wallet on Base Sepolia.
const provider = new JsonRpcProvider(BASE_SEPOLIA.rpcUrl);
const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

// 2. Construct. Only `wallet` is required; network defaults to base-sepolia.
const immunity = new Immunity({
  wallet,
  network: "base-sepolia",
  novelThreatPolicy: "trust-cache",
});

// 3. Bind contracts, build the lookup pipeline, hydrate the cache from chain.
await immunity.start();

// 4. One-time: fund the prepaid balance that settles the per-check fee.
if ((await immunity.balanceOf()) < parseUsdc("0.01")) {
  await immunity.deposit(parseUsdc("1"));
}

// 5. The proposed action. In a real agent this comes from the LLM tool call.
const tx = { to: "0xCAFE...", chainId: BASE_SEPOLIA.chainId } as const;

// 6. Gate it. The SDK consults the cache, then the chain, then (under verify) CRE.
const result = await immunity.check(tx, {
  conversation: [{ role: "user", content: "send to this random address" }],
});

// 7. Branch on the verdict.
if (!result.allowed) {
  console.warn(`blocked by ${result.antibodies[0]?.immId}: ${result.reason}`);
} else {
  await wallet.sendTransaction(tx);
}

await immunity.stop();
```

## Run it

You need:

- `WALLET_PRIVATE_KEY`, a 0x-prefixed hex key for a wallet with a small Base Sepolia ETH balance for gas.
- A testnet USDC balance to `deposit()`. See **[Test against testnet](/guides/test-against-testnet/)** for getting both.

```bash
WALLET_PRIVATE_KEY=0x... npx tsx quickstart.ts
```

## What just happened

1. **Construct.** `new Immunity({ ... })` is non-mutating. No network calls.
2. **`start()`.** Resolves the signer, binds the Base core contracts, attaches the five matchers, and (unless you disable it) hydrates the local cache from the Registry. Idempotent.
3. **`deposit()`.** The Registry holds a prepaid USDC balance per wallet. A settled `check()` and a CRE verification both draw the fee from it. `deposit()` tops it up.
4. **`check()`.** The hot path. Walks the [three tiers](/concepts/three-tier-lookup/). For a never-seen address under `trust-cache`, the path is: cache miss, registry miss, policy allows with `novel: true` and `checkId: null` (no on-chain call, no fee).
5. **Branch.** `result.allowed` is the only field your control flow needs. The rest (`decision`, `source`, `confidence`, `reason`, `antibodies`) is for logs and the operator UI.
6. **`stop()`.** Marks the instance stopped. Call it on shutdown.

## Pick the right policy

`novelThreatPolicy` controls what `check()` does when both the cache and the registry miss:

| Value | Behavior on miss | Cost |
|---|---|---|
| `"verify"` (default) | Requests a CRE jury verdict; can auto-publish if you opt in | a check fee + CRE compute, a few seconds |
| `"trust-cache"` | Allows, returns `novel: true` | no on-chain call |
| `"deny-novel"` | Blocks unconditionally | no on-chain call |

The quickstart uses `"trust-cache"` so it runs without spending on CRE. Production agents pick `"verify"` for real novel-threat detection. Use `"deny-novel"` for high-stakes operations where you would rather false-positive than wait for a verdict.

## Next

- **[Concepts in two minutes](/getting-started/concepts-in-two-minutes/)**, the mental model.
- **[Gate a transaction](/guides/gate-a-transaction/)**, the same example with production-grade error handling.
- **[Operator in the loop](/guides/operator-in-the-loop/)**, when a SUSPICIOUS verdict needs a human.
