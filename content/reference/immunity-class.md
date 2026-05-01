---
title: "Immunity class"
order: 1
description: "Every public method on the Immunity facade. Construction, lifecycle, the hot path, settlement, and admin."
---

# `Immunity` class

The facade. One instance per agent. Construction is non-mutating; lifecycle starts on `start()`. All public methods are async unless noted.

## `new Immunity(config)`

```ts
import { Immunity } from "@immunity-protocol/sdk";

const immunity = new Immunity({
  wallet,
  network: "testnet",
  axlUrl: "http://localhost:9002",
  novelThreatPolicy: "verify",
});
```

Throws `MissingConfigError` if `wallet` or `axlUrl` is missing. No network calls during construction. See [`ImmunityConfig`](/reference/immunityconfig/) for every option.

## Lifecycle

### `start(): Promise<void>`

Connects the signer to a provider, instantiates the Registry and USDC clients, attaches the five matchers, opens the AXL gossip subscription. Idempotent: a second call is a no-op.

Throws on:
- Missing wallet provider (must be ethers v6 `Signer`).
- AXL daemon unreachable at `axlUrl`.
- Registry contract not found at the configured network address.

### `stop(): Promise<void>`

Closes the gossip subscription, drains AXL polling. Idempotent. Always call on shutdown to avoid leaking file handles.

## The hot path

### `check(tx, context, options?): Promise<CheckResult>`

The method 99% of agent code calls.

```ts
const result = await immunity.check(tx, ctx);
```

Arguments:

- `tx: ProposedTx | null`, EVM action `{ to, value?, data?, chainId? }` or `null` for non-EVM agent actions.
- `context: CheckContext`, conversation, tools, sources, counterparty, metadata. All optional.
- `options.policy?: NovelThreatPolicy`, override the configured `novelThreatPolicy` for this call.

Returns a [`CheckResult`](/reference/checkresult/). Walks the [three tiers](/concepts/three-tier-lookup/) in order; first hit wins.

Errors:
- `NotStartedError` if called before `start()`.
- `InsufficientBalanceError` if prepaid balance is below the 0.002 USDC fee.
- `EscalationError` family if a SUSPICIOUS verdict timed out or was denied by the operator.
- `BlockError` is **not** thrown for ordinary blocks; check `result.allowed` instead. `BlockError` is reserved for hard policy violations (e.g., `deny-novel` block where the SDK refuses to even round-trip).

## Publishing

### `publish(input): Promise<PublishResult>`

```ts
const result = await immunity.publish({
  seed: { abType: "ADDRESS", chainId: 16602, target: "0xBAD..." },
  verdict: "MALICIOUS",
  confidence: 95,
  severity: 90,
});
```

Locks 1 USDC of stake for 72 hours. Returns:

```ts
{
  keccakId: Hex32;
  immSeq: number;
  immId: string;
  txHash: Hex32;
  stakeAmount: bigint;
}
```

Errors: `DuplicateAntibodyError` if the matcher already exists, `InsufficientBalanceError` if the prepaid balance is below stake + gas.

See [Publish an antibody](/guides/publish-an-antibody/) for the full pattern.

### `getAntibody(idOrSeq): Promise<Antibody>`

Read an antibody by `keccakId` or `immSeq`. The SDK routes the right contract call:

- `Hex32` resolves via `getAntibody(keccakId)`.
- `number` resolves via `getAntibodyByImmSeq(seq)`.

Throws `AntibodyNotFoundError` if the id does not exist.

## Money

### `balance(): Promise<bigint>`

Current prepaid USDC balance held by the Registry on your behalf. 6-decimal base units (multiply by `10^-6` for human USDC).

### `deposit(amount, approveMode?): Promise<Hex32>`

Top up the prepaid balance. Auto-approves the allowance:
- `"exact"` (default), approves exactly `amount`. Fewer approvals to fund subsequent deposits.
- `"max"`, approves `MaxUint256`. One-time setup; subsequent deposits skip approval.

```ts
await immunity.deposit(parseUsdc("1.5"));
```

### `withdraw(amount): Promise<Hex32>`

Pull USDC out of the Registry back to the wallet. Subject to stake-lock if `amount` overlaps locked stake.

Throws `StakeLockedError` if the requested amount overlaps locked stake.

### `mintTestUsdc(amount): Promise<Hex32>`

**Testnet only.** Calls MockUSDC's public `mint(to, amount)`. Throws on real-USDC contracts.

```ts
await immunity.mintTestUsdc(parseUsdc("1"));
```

## Stats and admin

### `publisherStats(): Promise<PublisherStats>`

```ts
const stats = await immunity.publisherStats();
// { totalStaked, totalEarned, publishedCount, slashedCount }
```

All amounts are in USDC base units (6 decimals).

### `dropFromCache(keccakId): boolean`

Local-only operation. Removes an antibody from the in-memory cache without touching the chain. Useful for muting a known-bad antibody locally when the on-chain `slash()` is not reachable. Returns `true` if the entry was present.

### `sweep(): Promise<SweepResult>`

Standalone call to opportunistically release any expired stakes you own. The same sweep runs implicitly inside `check()`, so most users never need this. The reward is paid in USDC and is small (`SWEEP_BOUNTY` per release, ~$0.0001).

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, every constructor option.
- **[CheckResult](/reference/checkresult/)**, the shape of `check()`'s return.
- **[Errors](/reference/errors/)**, full taxonomy with stable codes.
