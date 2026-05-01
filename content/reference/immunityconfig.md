---
title: "ImmunityConfig"
order: 2
description: "Every option on the constructor config object. Defaults, constraints, fail modes."
---

# `ImmunityConfig`

The argument to `new Immunity(config)`. All fields except `wallet` and `axlUrl` are optional with sensible defaults.

## Required

### `wallet`

Type: `Signer | string`

ethers v6 `Signer` instance, or a 0x-prefixed private-key string. The SDK normalizes both. Used to sign every on-chain settlement and publish.

```ts
import { Wallet } from "ethers";
const wallet = new Wallet(process.env.PRIVATE_KEY!);
```

If you pass a private-key string, the SDK constructs a wallet against the configured network's RPC. If you pass a `Signer`, the SDK uses it as-is (the signer must already be connected to a provider).

Throws `MissingConfigError` on construction if absent.

### `axlUrl`

Type: `string`

External Gensyn AXL daemon HTTP endpoint. The SDK does not embed AXL.

```ts
axlUrl: "http://localhost:9002"
```

For Docker-Compose contexts, the daemon must bind to `0.0.0.0` (not the default `127.0.0.1`) or it is unreachable from the host. See `infra/axl-mesh/` in the SDK repo for a 2-node mesh template.

Throws `MissingConfigError` on construction if absent.

## Network

### `network`

Type: `"testnet" | NetworkConfig`. Default: `"testnet"`.

Pick the on-chain Registry to target.

```ts
network: "testnet"
```

For mainnet (when published), pass a custom `NetworkConfig`:

```ts
network: {
  name: "mainnet",
  chainId: 16600,
  rpcUrl: "https://evmrpc.0g.ai",
  registryAddress: "0x...",
  usdcAddress: "0x...",
  blockExplorerUrl: "https://chainscan.0g.ai",
  computeProvider: "0x...",
  storageIndexerUrl: "https://indexer-storage.0g.ai",
}
```

### `axlIdentityPath`

Type: `string`. Default: ephemeral.

Path to an ed25519 PEM file used as the agent's persistent peer identity in the AXL mesh. Without it, the SDK generates a fresh identity at every start and your AXL pubkey rotates, which means subscribers lose you.

Generate one with:

```bash
openssl genpkey -algorithm ed25519 -out agent.pem
chmod 600 agent.pem
```

Pass the path:

```ts
axlIdentityPath: "/var/lib/myagent/agent.pem"
```

## Decision policy

### `novelThreatPolicy`

Type: `"verify" | "trust-cache" | "deny-novel"`. Default: `"verify"`.

What `check()` does when both Tier 1 (cache) and Tier 2 (registry) miss.

| Value | Behavior | Cost |
|---|---|---|
| `"verify"` | Fires TEE inference, auto-publishes if block | ~3 s, ~$0.0001 0G Compute |
| `"trust-cache"` | Allows, returns `novel: true` | $0 |
| `"deny-novel"` | Blocks unconditionally | $0 |

Override per-call via `check(tx, ctx, { policy: "deny-novel" })`.

### `confidenceThresholds`

Type: `{ block?: number; escalate?: number }`. Default: `{ block: 85, escalate: 60 }`.

TEE verdict thresholds (0..100). Behavior at each threshold:

- `confidence >= block`, automatic block.
- `escalate <= confidence < block`, invokes `onEscalate` handler. If no handler is configured, throws `EscalationError`.
- `confidence < escalate`, automatic allow.

```ts
confidenceThresholds: { block: 90, escalate: 70 }
```

Tighter thresholds (higher block, higher escalate) = fewer false positives, more pass-throughs. Looser = the opposite.

### `onEscalate`

Type: `(ctx: EscalationContext) => Promise<boolean>`. Default: undefined.

Async handler invoked when a SUSPICIOUS verdict falls in the escalate band. Return `true` to allow, `false` to block.

```ts
onEscalate: async ({ reason, confidence, matched }) => {
  return await promptOperator(reason, matched);
}
```

See [Operator in the loop](/guides/operator-in-the-loop/) for patterns.

### `escalationTimeout`

Type: `number` (seconds). Default: `300`.

How long the SDK waits for `onEscalate` to resolve. After the timeout, `onTimeout` decides.

### `onTimeout`

Type: `"deny" | "allow"`. Default: `"deny"`.

Decision when the escalate handler times out. `"deny"` is the safe default.

## Custom verifier

### `teeVerifier`

Type: `TeeVerifyFn`. Default: built from 0G Compute broker.

Pluggable backend for TEE verification. The default uses 0G Compute's qwen-2.5-7b-instruct provider. Override to inject:
- An Anthropic-backed shim during testnet flakes.
- A local model gateway for offline development.
- A deterministic stub for tests.

The function signature:

```ts
type TeeVerifyFn = (
  tx: ProposedTx | null,
  ctx: CheckContext
) => Promise<TeeVerifyOutcome | null>;
```

Returning `null` means "TEE not available, fall through to policy".

## Cache and gossip

### `denyKeccakIds`

Type: `readonly string[]`. Default: `[]`.

Local-only mute list. When a Tier 1 cache hit or Tier 2 lookup hit comes back with a keccak in this set, check-flow treats it as a miss and continues. Used to mute a known-bad auto-mint locally when the on-chain `slash()` is not reachable.

```ts
denyKeccakIds: ["0xBADANTIBODYIDIPUBLISHEDBYACCIDENT..."]
```

### `semanticAutoMint`

Type: `boolean`. Default: `false`.

Opt in to TEE-driven SEMANTIC auto-publishes. When `false`, the SDK still detects SEMANTIC threats but does not auto-mint a new antibody from a TEE-supplied marker substring. Set to `true` if you have validated your TEE provider's marker quality.

### `bootstrapCacheOnStart`

Type: `boolean`. Default: `true`.

Whether to hydrate the cache from the chain at `start()`. Useful to disable in tests or in agents that genuinely want a cold cache for first-block timing measurements.

## Funding thresholds

### `minLedgerOg`

Type: `number`. Default: `0.1`.

Minimum 0G Compute ledger balance (in OG) before `start()` warns. Set to 0 to skip the check (e.g., when using a `teeVerifier` shim that does not need 0G Compute).

### `minProviderOg`

Type: `number`. Default: `0.05`.

Minimum 0G Compute provider sub-account balance (in OG) before `start()` warns.

## Full example

```ts
import { Immunity } from "@immunity-protocol/sdk";
import { Wallet } from "ethers";

const immunity = new Immunity({
  wallet: new Wallet(process.env.WALLET_PRIVATE_KEY!),
  network: "testnet",
  axlUrl: "http://localhost:9002",
  axlIdentityPath: "/var/lib/agent/axl.pem",
  novelThreatPolicy: "verify",
  confidenceThresholds: { block: 85, escalate: 60 },
  onEscalate: async ({ reason }) => promptOperator(reason),
  escalationTimeout: 120,
  onTimeout: "deny",
  semanticAutoMint: false,
});
```

## See also

- **[Immunity class](/reference/immunity-class/)**, the methods you call after construction.
- **[CheckResult](/reference/checkresult/)**, the shape of `check()`'s return.
- **[Errors](/reference/errors/)**, full taxonomy.
