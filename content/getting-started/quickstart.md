---
title: "Quickstart"
order: 2
description: "A 30-line agent that imports the SDK, gates a transaction with check(), and decides whether to sign."
---

# Quickstart

This is the smallest agent that uses Immunity correctly. Copy it, set two env vars, run it, watch the network respond.

## The full example

```ts
import { Immunity, parseUsdc, TESTNET } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

// 1. Wallet on Galileo testnet
const provider = new JsonRpcProvider(TESTNET.rpcUrl);
const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

// 2. Construct the SDK. Required: wallet + axlUrl. Network defaults to testnet.
const immunity = new Immunity({
  wallet,
  network: "testnet",
  axlUrl: "http://localhost:9002",
  novelThreatPolicy: "trust-cache",
});

// 3. Connect to the Registry, attach matchers, open the gossip subscription.
await immunity.start();

// 4. Bootstrap the prepaid USDC balance on first run.
if ((await immunity.balance()) < parseUsdc("0.01")) {
  await immunity.mintTestUsdc(parseUsdc("1"));
  await immunity.deposit(parseUsdc("0.5"));
}

// 5. Build a proposed action. In a real agent this comes from the LLM tool call.
const tx = { to: "0xCAFE..." as const, chainId: TESTNET.chainId };

// 6. Gate it. The SDK consults the cache, then the chain, then the TEE.
const result = await immunity.check(tx, {
  conversation: [{ role: "user", content: "send to this random address" }],
});

// 7. Branch on the verdict.
if (!result.allowed) {
  console.warn(`blocked by ${result.antibodies[0]?.immId}: ${result.reason}`);
} else {
  await wallet.sendTransaction(tx);
}

// 8. Drain the subscription cleanly.
await immunity.stop();
```

## Run it

You need:
- `WALLET_PRIVATE_KEY`, a 0x-prefixed hex string for a wallet with a small testnet OG balance. Get OG from the [Galileo faucet](https://faucet.0g.ai).
- A running AXL daemon at `http://localhost:9002`. The 2-node mesh template lives at `infra/axl-mesh/` in the SDK repo.

```bash
WALLET_PRIVATE_KEY=0x... npx tsx quickstart.ts
```

## What just happened

Step by step against a fresh address.

1. **Construct.** `new Immunity({ ... })` is non-mutating. No network calls.
2. **`start()`.** Connects the signer, instantiates the Registry and USDC clients, attaches the five matchers to the cache, opens the AXL gossip subscription. Idempotent.
3. **Mint and deposit.** First-run bootstrap. The Registry holds a prepaid USDC balance per agent. Each settled `check()` debits 0.002 USDC from it. Calling `deposit()` tops it up.
4. **`check()`.** The hot path. Walks the [three tiers](/concepts/three-tier-lookup/). For a never-seen address with `novelThreatPolicy: "trust-cache"`, the path is: cache miss, registry miss, policy decides allow with `novel: true`.
5. **Branch.** `result.allowed` is the only field you need for control flow. The rest, `decision`, `source`, `confidence`, `reason`, `antibodies`, are for logs and the operator UI.
6. **`stop()`.** Drains the gossip subscription, closes AXL polling. Skip and the process leaks file handles.

## Pick the right policy

`novelThreatPolicy` controls what happens on a cache + registry miss:

| Value | Behavior on miss | Cost |
|---|---|---|
| `"verify"` | Fires TEE inference, auto-publishes if block | ~3 s, ~$0.0001 0G Compute |
| `"trust-cache"` | Allows, returns `novel: true` | $0 |
| `"deny-novel"` | Blocks unconditionally | $0 |

The quickstart uses `"trust-cache"` so it runs without a 0G Compute account. Production agents pick `"verify"` for actual novel-threat detection. Use `"deny-novel"` for high-stakes operations where TEE latency is unacceptable and you would rather false-positive than wait.

## Next

- **[Concepts in two minutes](/getting-started/concepts-in-two-minutes/)**, the mental model.
- **[Gate a transaction](/guides/gate-a-transaction/)**, the same example with production-grade error handling.
- **[Operator in the loop](/guides/operator-in-the-loop/)**, when a SUSPICIOUS verdict needs a human.
