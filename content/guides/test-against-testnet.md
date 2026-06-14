---
title: "Test against testnet"
order: 7
description: "End-to-end setup for running the SDK against Base Sepolia: faucet, USDC, deposit, first check."
---

# Test against testnet

The fastest way to verify your integration is to run it against the live **Base Sepolia** deployment. No Docker, no external daemon, no mainnet exposure.

## Prerequisites

- **Node 20+**.
- A **wallet** for Base Sepolia. Generate one with `openssl rand -hex 32` and keep the key offline.

## Step 1: get Base Sepolia ETH

Fund your wallet with a small amount of Base Sepolia ETH from a Base Sepolia faucet (it pays gas for `check()` settlement, `publish`, and `register`). Confirm the balance:

```bash
curl -sS -X POST https://sepolia.base.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYOUR_ADDRESS","latest"],"id":1}'
```

## Step 2: get test USDC

The Base Sepolia deployment uses a testnet USDC at `BASE_SEPOLIA.addresses.usdc`. Acquire some into your wallet, then `deposit()` it into your prepaid Registry balance (the SDK example below does the deposit for you). The prepaid balance is what settles per-check fees and funds CRE verification.

## Step 3: install the SDK

```bash
mkdir my-immunity-test && cd my-immunity-test
npm init -y
npm install @immunity-protocol/sdk ethers
npm install -D tsx typescript
```

A TypeScript config that matches the SDK's ESM output:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Step 4: write the test agent

Save as `test-agent.ts`:

```ts
import { Immunity, parseUsdc, BASE_SEPOLIA } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider(BASE_SEPOLIA.rpcUrl);
const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

const immunity = new Immunity({
  wallet,
  network: "base-sepolia",
  novelThreatPolicy: "trust-cache",
});

await immunity.start();

if ((await immunity.balanceOf()) < parseUsdc("0.01")) {
  await immunity.deposit(parseUsdc("1"));
}

// Check a known-flagged address (assuming an antibody has been published for it).
const flagged = "0x722122df12d4e14e13ac3b6895a86e84145b6967";
const result = await immunity.check(
  { to: flagged, chainId: BASE_SEPOLIA.chainId },
  { conversation: [] },
);

console.log({
  allowed: result.allowed,
  source: result.source,
  immId: result.antibodies[0]?.immId,
  reason: result.reason,
});

await immunity.stop();
```

## Step 5: run

```bash
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY npx tsx test-agent.ts
```

A flagged address that is hard-blocked:

```
{ allowed: false, source: "registry", immId: "IMM-2026-0042",
  reason: "sanctioned mixer router" }
```

A fresh address the network has never seen, under `trust-cache`:

```
{ allowed: true, source: "policy", immId: undefined,
  reason: "no match (novel under trust-cache policy)" }
```

## Step 6: explore

- **Switch to `verify`.** Set `novelThreatPolicy: "verify"` and re-run on a fresh address. The CRE round-trip fires (slower, but you see the full flow).
- **Register and publish.** Call `registerPublisher("...")`, then `publish({ ... })`, and watch the tx on [Basescan](https://sepolia.basescan.org).
- **Watch the public feed.** See **[The public feed](/guides/the-public-feed/)**; your publish appears within seconds.

## Common stumbles

| Symptom | Fix |
|---|---|
| `ERR_INSUFFICIENT_BALANCE` | get test USDC, then `deposit()` first |
| `ERR_NOT_REGISTERED` on publish | call `registerPublisher(label)` first |
| `verify` never blocks a novel input | a verifier must be available; on Base Sepolia it is built automatically |
| ethers v5 errors | the SDK requires ethers v6; check your install |

## Next

- **[Gate a transaction](/guides/gate-a-transaction/)**, the production hardening.
- **[Operator in the loop](/guides/operator-in-the-loop/)**, when SUSPICIOUS verdicts need a human.
- **[Reference: Network presets](/reference/network-presets/)**, the live addresses.
