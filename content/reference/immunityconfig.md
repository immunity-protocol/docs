---
title: "ImmunityConfig"
order: 2
description: "Every option on the constructor config object. Defaults, constraints, fail modes."
---

# `ImmunityConfig`

The argument to `new Immunity(config)`. Only `wallet` is required; everything else has a sensible default.

## Required

### `wallet`

Type: `Signer | string`.

An ethers v6 `Signer`, or a 0x-prefixed 64-hex-char private-key string. A private key (or an unconnected signer) is connected to the network's RPC at `start()`. Used to sign every on-chain call.

```ts
import { Wallet } from "ethers";
const wallet = new Wallet(process.env.PRIVATE_KEY!);
```

Throws `MissingConfigError` if absent or malformed.

## Network

### `network`

Type: `"base-sepolia" | "base-mainnet" | NetworkConfig`. Default: `"base-sepolia"`.

Pick the on-chain network. `"base-sepolia"` is the live network; `"base-mainnet"` is a placeholder until the audited mainnet deploy. Pass a [`NetworkConfig`](/reference/network-presets/) object for a self-hosted deployment.

```ts
network: "base-sepolia"
```

## Decision policy

### `novelThreatPolicy`

Type: `"verify" | "trust-cache" | "deny-novel"`. Default: `"verify"`.

What `check()` does when both Tier 1 (cache) and Tier 2 (registry) miss.

| Value | Behavior | Cost |
|---|---|---|
| `"verify"` | requests a CRE jury verdict; can auto-publish if you opt in | a check fee + CRE compute |
| `"trust-cache"` | allows, returns `novel: true` | no on-chain call |
| `"deny-novel"` | blocks unconditionally | no on-chain call |

Override per call via `check(tx, ctx, { policy: "deny-novel" })`.

### `unverifiedAntibodyPolicy`

Type: `"ignore" | "escalate" | "block" | "corroborate"`.

How the agent treats an **advisory** match (an antibody that is not yet hard-block-eligible). This governs the protective action, not whether a fee is charged.

| Value | Behavior on an advisory match |
|---|---|
| `ignore` | take no protective action (allow), still settle any fee |
| `escalate` | surface to `onEscalate` for an operator decision |
| `block` | act on advisories as if hard-block |
| `corroborate` | re-verify through CRE and, if confirmed, publish a corroborating antibody |

See [Two-speed enforcement](/concepts/two-speed-enforcement/).

### `confidenceThresholds`

Type: `{ block?: number; escalate?: number }`. Default: `{ block: 85, escalate: 60 }`.

Verdict thresholds (0..100). `confidence >= block` auto-blocks a MALICIOUS verdict; `confidence >= escalate` triggers `onEscalate`; below that, allow.

### `onEscalate`

Type: `(ctx: EscalationContext) => Promise<boolean>`. Default: undefined.

Async handler invoked when a SUSPICIOUS verdict lands in the escalate band. Return `true` to allow, `false` to block. `EscalationContext` is `{ reason, confidence, matched: { keccakId, immId }[] }`. See [Operator in the loop](/guides/operator-in-the-loop/).

### `escalationTimeout`

Type: `number` (seconds). How long to wait for `onEscalate` before `onTimeout` decides.

### `onTimeout`

Type: `"deny" | "allow"`. Decision when the escalate handler times out. `"deny"` is the safe default.

## Tier-3 verification

### `verifier`

Type: `NovelVerifier`. Default: built-in CRE verifier.

The Tier-3 novel-input verifier. On Base Sepolia the SDK builds the CRE-backed verifier from the network config automatically. Inject your own for tests, a custom backend, or offline development. When no verifier is available, the `verify` path fails **closed**.

### `autoPublishConfirmedThreats`

Type: `boolean`. Default: `false`.

When a Tier-3 verify or corroborate confirms a threat during `check()`, automatically publish or corroborate an antibody on chain. The protective decision and re-verification always happen regardless; this gates only the bond-spending write, and only when the wallet is registered and funded. The detached write is surfaced as `CheckResult.pendingWrite`.

## Cache

### `denyKeccakIds`

Type: `ReadonlyArray<0x string>`. Default: `[]`.

Local-only mute list. A Tier-1 or Tier-2 hit whose `keccakId` is in this set is treated as a miss. Use it to mute an antibody locally while you address it on chain.

### `bootstrapCacheOnStart`

Type: `boolean`. Default: `true`.

Hydrate the local cache from the Registry at `start()`. Set `false` for one-shot scripts.

### `bootstrap`

Type: `{ concurrency?: number; limit?: number; fetchRetries?: number }`.

Tuning for the bootstrap step: `concurrency` (default 4), `limit` (default none), `fetchRetries` (default 3).

## Full example

```ts
import { Immunity } from "@immunity-protocol/sdk";
import { Wallet } from "ethers";

const immunity = new Immunity({
  wallet: new Wallet(process.env.WALLET_PRIVATE_KEY!),
  network: "base-sepolia",
  novelThreatPolicy: "verify",
  unverifiedAntibodyPolicy: "escalate",
  confidenceThresholds: { block: 85, escalate: 60 },
  onEscalate: async ({ reason }) => promptOperator(reason),
  escalationTimeout: 120,
  onTimeout: "deny",
  autoPublishConfirmedThreats: false,
});
```

## See also

- **[Immunity class](/reference/immunity-class/)**, the methods you call after construction.
- **[Network presets](/reference/network-presets/)**, the `NetworkConfig` shape.
- **[Errors](/reference/errors/)**, full taxonomy.
