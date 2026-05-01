---
title: "Test against testnet"
order: 5
description: "End-to-end setup for running the SDK against 0G Galileo testnet. Faucet, AXL mesh, USDC bootstrap, first check."
---

# Test against testnet

The fastest way to verify your integration is to run it against 0G Galileo testnet. This guide is the canonical setup. Bookmark it; the steps are quick once you've done them once.

## Prerequisites

- **Node 20+** installed.
- **Docker** for the AXL daemon mesh.
- A **wallet** for testnet OG. Generate one with `openssl rand -hex 32` and keep the key offline.

That's it. No real money, no mainnet exposure, no production credentials.

## Step 1: get testnet OG

The Galileo faucet at [faucet.0g.ai](https://faucet.0g.ai) drips 0.5 OG per request. That's enough for hundreds of `check()` settlements plus a few publishes.

Paste your wallet's public address. Wait ~10 seconds. Confirm balance:

```bash
curl -sS -X POST https://evmrpc-testnet.0g.ai \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYOUR_ADDRESS","latest"],"id":1}'
```

The result is hex wei. `0x6f05b59d3b20000` is 0.5 ETH-equivalent (that is OG).

## Step 2: bring up the AXL mesh

The SDK needs an external Gensyn AXL daemon. The 2-node mesh template lives in the SDK repo:

```bash
git clone https://github.com/ophelios-studio/immunity-sdk.git
cd immunity-sdk/infra/axl-mesh

# Generate ed25519 identity keys (one per node).
make keys

# Bring up alice (port 9002) and bob (port 9012) in Docker.
make up
```

Verify the mesh is healthy:

```bash
curl -sS http://localhost:9002/topology | jq .our_public_key
curl -sS http://localhost:9012/topology | jq .our_public_key
```

You should see two distinct ed25519 pubkeys, and each node should list the other in its `peers` array.

## Step 3: install the SDK

In a fresh project:

```bash
mkdir my-immunity-test && cd my-immunity-test
npm init -y
npm install --legacy-peer-deps @immunity-protocol/sdk ethers
npm install -D tsx typescript
```

Drop a TypeScript config that matches the SDK's expectations:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Step 4: write the test agent

Save as `test-agent.ts`:

```ts
import { Immunity, parseUsdc, TESTNET } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider(TESTNET.rpcUrl);
const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

const immunity = new Immunity({
  wallet,
  network: "testnet",
  axlUrl: "http://localhost:9002",
  novelThreatPolicy: "trust-cache",
});

await immunity.start();

if ((await immunity.balance()) < parseUsdc("0.01")) {
  await immunity.mintTestUsdc(parseUsdc("1"));
  await immunity.deposit(parseUsdc("0.5"));
}

// Try a known-flagged Tornado Cash address.
// (assuming someone has published an antibody for it)
const tornado = "0x722122df12d4e14e13ac3b6895a86e84145b6967";
const result = await immunity.check(
  { to: tornado, chainId: TESTNET.chainId },
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

Expected output for a flagged address (something like Tornado Cash that's been published already):

```
{
  allowed: false,
  source: "registry",
  immId: "IMM-2026-0042",
  reason: "Tornado Cash sanctioned router (OFAC SDN)"
}
```

For a fresh address that the network has never seen:

```
{
  allowed: true,
  source: "policy",
  immId: undefined,
  reason: "no match (novel under trust-cache policy)"
}
```

## Step 6: explore

Now that the loop works, try:

- **Switch to verify policy**, change `novelThreatPolicy: "verify"` and re-run with a fresh address. The TEE round-trip will fire (slow but you see the flow).
- **Publish your own antibody**, write a `publish.ts` that calls `immunity.publish({ ... })`. Watch the on-chain tx in the [block explorer](https://chainscan-galileo.0g.ai).
- **Watch the public feed**, [immunity-protocol.com/feed/antibodies.json](https://immunity-protocol.com/feed/antibodies.json) updates as antibodies mint. You should see your publish appear within seconds.

## Common stumbles

| Symptom | Fix |
|---|---|
| `MissingConfigError: axlUrl` | the AXL mesh is not up; `make up` in `infra/axl-mesh/` |
| `ERR_INSUFFICIENT_BALANCE` | call `mintTestUsdc()` then `deposit()` first |
| storage upload hangs ~30s | port 5678 outbound is blocked; switch network |
| `processResponse rejected` | TEE provider rotated keys; recreate the Immunity instance |
| ethers v5 errors | the SDK requires ethers v6; check your install |

## Next

- **[Gate a transaction](/guides/gate-a-transaction/)**, the production hardening.
- **[Operator in the loop](/guides/operator-in-the-loop/)**, when SUSPICIOUS verdicts need a human.
- **[Reference: ImmunityConfig](/reference/immunityconfig/)**, every option explained.
