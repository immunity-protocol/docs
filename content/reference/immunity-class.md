---
title: "Immunity class"
order: 1
description: "Every public method on the Immunity facade: construction, lifecycle, the hot path, publishing, the challenge game, identity, and money."
---

# `Immunity` class

The facade. One instance per agent. Construction is non-mutating; lifecycle starts on `start()`. All methods below are async unless noted.

## `new Immunity(config)`

```ts
import { Immunity } from "@immunity-protocol/sdk";

const immunity = new Immunity({
  wallet,
  network: "base-sepolia",
  novelThreatPolicy: "verify",
});
```

Throws `MissingConfigError` if `wallet` is missing. No network calls during construction. `network` defaults to `"base-sepolia"`. See [`ImmunityConfig`](/reference/immunityconfig/) for every option.

## Lifecycle

### `start(): Promise<void>`

Resolves the signer to the network RPC, binds the Base core contracts, constructs the storage client and (unless you injected one) the CRE verifier, builds the five matchers and the enforcement pipeline, and, when `bootstrapCacheOnStart` is true, hydrates the local cache from the Registry. Idempotent: a second call is a no-op.

### `stop(): Promise<void>`

Marks the instance stopped. Idempotent. Call on shutdown.

## Accessors

| Getter | Returns | Notes |
|---|---|---|
| `network` | `NetworkConfig` | the resolved network config |
| `wallet` | `Address` | the connected address; throws `NotStartedError` before `start()` |
| `contracts` | `CoreContracts` | live read/write bindings to the deployed Base contracts; throws `NotStartedError` before `start()` |

Use `contracts.registry` with `decodeAntibody` (a re-exported helper) to read antibodies directly when you need raw on-chain data.

## The hot path

### `check(tx, context, options?): Promise<CheckResult>`

The method 99% of agent code calls.

```ts
const result = await immunity.check(tx, ctx);
```

Arguments:

- `tx: ProposedTx | null`, an EVM action `{ to, value?, data?, chainId? }`, or `null` for non-EVM agent actions.
- `context: CheckContext`, conversation, tool trace, sources, counterparty, metadata. All fields optional.
- `options?: CheckOptions`, currently `{ policy? }` to override `novelThreatPolicy` for this call.

Returns a [`CheckResult`](/reference/checkresult/). Walks the [three tiers](/concepts/three-tier-lookup/), then applies the enforcement and policy decision.

Errors:

- `NotStartedError` if called before `start()`.
- `InsufficientBalanceError` if the prepaid balance cannot cover a settled fee.
- `EscalationError` family if a SUSPICIOUS verdict timed out or was denied by the operator.
- Ordinary blocks are **not** thrown; check `result.allowed`.

## Publishing and the immune response

### `publish(input): Promise<PublishResult>`

```ts
const result = await immunity.publish({
  seed: { abType: "ADDRESS", chainId: 84532, target: "0xBAD..." },
  verdict: "MALICIOUS",
  confidence: 95,
  severity: 90,
  reasonSummary: "Known drainer contract",
});
```

Uploads the evidence envelope to storage, then locks a bond sized by severity and target prominence. Returns:

```ts
{ keccakId, immSeq, immId, evidenceCid, contextHash?, txHash }
```

Requires a registered publisher (`registerPublisher` first) and a balance that covers the bond. Errors: `NotRegisteredError`, `DuplicateAntibodyError` (with the existing `keccakId`), `InsufficientBalanceError`. See [Publish an antibody](/guides/publish-an-antibody/).

### `corroborate(input): Promise<PublishResult>`

Same input and output as `publish()`. Publishes a second antibody under your identity against the same matcher, incrementing the distinct-publisher count toward hard-block. See [Corroboration and maturation](/concepts/corroboration-and-maturation/).

### `challenge(antibodyId): Promise<{ bond, txHash }>`

Posts a challenge bond and moves the antibody to `CHALLENGED`. A probationary antibody drops to advisory; a matured one keeps enforcing.

### `mature(antibodyId): Promise<{ txHash }>`

Permissionless poke that promotes a probation antibody to `ACTIVE` once its maturation rule is satisfied (corroboration reaches `K`, or undisputed volume over time).

## Identity

### `registerPublisher(label): Promise<{ txHash, bond }>`

Mints the contract-owned `label.immunity.eth` subname, locks the registration bond, and initializes reputation to zero. Required before `publish()`. Errors: `AlreadyRegisteredError`.

### `deregister(): Promise<{ txHash }>`

Releases the registration and refunds the bond.

### `isRegistered(): Promise<boolean>`

True if the connected wallet is a registered publisher.

## Money

### `balanceOf(): Promise<bigint>`

Current prepaid USDC balance held by the Registry for your wallet, in 6-decimal base units.

### `deposit(amount): Promise<{ txHash }>`

Top up the prepaid balance. `amount` is in USDC base units; use `parseUsdc("1.5")`.

### `withdraw(amount): Promise<{ txHash }>`

Pull USDC back to the wallet. Throws `StakeLockedError` if the amount overlaps a locked bond.

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, every constructor option.
- **[CheckResult](/reference/checkresult/)**, the shape of `check()`'s return.
- **[Errors](/reference/errors/)**, full taxonomy with stable codes.
