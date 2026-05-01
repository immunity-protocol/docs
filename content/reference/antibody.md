---
title: "Antibody"
order: 4
description: "Every field on the on-chain Antibody envelope. The contract-aligned shape plus the off-chain seed for cache reconstruction."
---

# `Antibody`

The contract-aligned envelope for a published threat. One per `keccakId`. Read via `getAntibody(idOrSeq)`. Returned in `CheckResult.antibodies` on a match.

## Full shape

```ts
interface Antibody {
  keccakId:           Hex32;
  immSeq:             number;
  immId:              string;
  abType:             AntibodyType;
  flavor:             number;
  verdict:            Verdict;
  status:             Status;
  confidence:         number;
  severity:           number;
  primaryMatcherHash: Hex32;
  evidenceCid:        Hex32;
  contextHash:        Hex32;
  embeddingHash:      Hex32;
  attestation:        Hex32;
  publisher:          Address;
  reviewer:           Address;
  stakeAmount:        bigint;
  stakeLockUntil:     bigint;
  expiresAt:          bigint;
  createdAt:          bigint;
  isSeeded:           boolean;
  seed?:              AntibodySeed;
}
```

## Identity

### `keccakId`

Type: `Hex32`. The on-chain primary key. Computed off-chain by:

```
keccakId = keccak256(abi.encode(abType, flavor, primaryMatcherHash, publisher))
```

Used as the contract's mapping key for the antibody storage slot. Stable for life.

### `immSeq`

Type: `number`. Sequential `uint64` assigned at publish time, monotonic across the whole Registry.

### `immId`

Type: `string`. Format `IMM-YYYY-NNNN` (year + four-digit pad). Derived from `immSeq` and `createdAt`. The human-readable form. Used in URLs (`/antibody/IMM-2026-0042`), in logs, in the public feed.

## Classification

### `abType`

Type: `AntibodyType` enum. One of:
- `"ADDRESS"`, specific wallets and contracts.
- `"CALL_PATTERN"`, function shapes (selector + args).
- `"BYTECODE"`, runtime hash matching.
- `"GRAPH"`, multi-hop taint topology.
- `"SEMANTIC"`, manipulation patterns and prompt injection.

### `flavor`

Type: `number` (uint8). Type-specific subtype.

For SEMANTIC, `flavor` corresponds to a family in the incident catalog (1 = ignore-instructions, 2 = system-tag-spoof, etc.). For other types, currently unused (defaults to 0).

### `verdict`

Type: `Verdict` enum. `"MALICIOUS"` (always block) or `"SUSPICIOUS"` (escalate band).

### `status`

Type: `Status` enum. Current on-chain state:

- `"ACTIVE"`, eligible to match. Stake locked or earning. Default after `publish()`.
- `"CHALLENGED"`, a challenge is pending. Match-time lookups skip CHALLENGED antibodies until the challenge resolves.
- `"SLASHED"`, challenge succeeded; antibody disabled, stake forfeited.
- `"EXPIRED"`, v2 only. v1 treats every antibody as permanent.

### `confidence`

Type: `number`, range 0..100. Publisher-asserted confidence in the verdict.

### `severity`

Type: `number`, range 0..100. Publisher-asserted damage potential. Informational; no protocol behavior depends on it.

## Matcher data

### `primaryMatcherHash`

Type: `Hex32`. The keccak256 of the type-specific matcher tuple. Used as the index for fast on-chain lookups (`Registry.getAntibodyByMatcherHash`). Computed by:

- ADDRESS, `keccak256(abi.encode(chainId, target))`.
- CALL_PATTERN, `keccak256(abi.encode(chainId, target, selector, argsTemplateHash))`.
- BYTECODE, `keccak256(runtimeBytecode)`.
- GRAPH, `keccak256(abi.encode(chainId, sortedAddresses))`.
- SEMANTIC, `keccak256(abi.encode(flavor, marker))`.

The SDK exports per-type helpers: `hashAddressMatcher()`, `hashCallPatternMatcher()`, etc. See [Helpers](/reference/helpers/).

### `evidenceCid`

Type: `Hex32`. 0G Storage pointer to the evidence bundle (the original tx, the marker text, the chain log). Public envelope by default; encryptable for sensitive seeds.

Resolve via `fetchPublicEnvelope(cid)` or directly through the 0G Storage indexer.

### `contextHash`

Type: `Hex32`. Hash of the context the publisher used when minting. Matches the `contextHash` the SDK includes in `Registry.check()` settlement so the indexer can correlate publishes with checks.

### `embeddingHash`

Type: `Hex32`. SEMANTIC-only. Hash of the embedding vector for ANN-based similarity search (deferred to v2). Zero for non-SEMANTIC antibodies.

### `attestation`

Type: `Hex32`. TEE attestation when the antibody was published from a TEE verdict. Zero for human/manual publishes.

## Provenance

### `publisher`

Type: `Address`. The wallet that called `publish()`. Earns 80% of the protocol fee on each match for the life of the antibody.

### `reviewer`

Type: `Address`. Reserved for v2 governance review. Currently always zero.

### `stakeAmount`

Type: `bigint`. The staked USDC, in 6-decimal base units. Default `1_000_000n` (1 USDC).

### `stakeLockUntil`

Type: `bigint`. Unix timestamp when stake unlocks. `createdAt + 72 hours` typical.

### `expiresAt`

Type: `bigint`. Unix timestamp of expiry. **`0` in v1** (treated as permanent). Reserved for v2.

### `createdAt`

Type: `bigint`. Unix timestamp of the publish tx.

## Off-chain enrichment

### `isSeeded`

Type: `boolean`. `true` if the antibody was published with an off-chain seed payload (gossiped alongside for cache reconstruction). `false` for chain-only publishes.

### `seed`

Type: `AntibodySeed` (discriminated union by `abType`). Optional. The matcher reconstruction seed: data subscribers need to rebuild a type-specific lookup locally without re-reading the chain.

For ADDRESS antibodies: `{ abType: "ADDRESS", chainId, target }`.
For CALL_PATTERN: `{ abType: "CALL_PATTERN", chainId, target, selector, argsTemplate }`.
And so on per type.

## Reading antibodies

```ts
const ab = await immunity.getAntibody("IMM-2026-0042");
console.log({
  immId: ab.immId,
  type: ab.abType,
  verdict: ab.verdict,
  status: ab.status,
  confidence: ab.confidence,
  publisher: ab.publisher,
  stakeUnlock: new Date(Number(ab.stakeLockUntil) * 1000),
});
```

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the lifecycle picture.
- **[Helpers](/reference/helpers/)**, the per-type matcher hash helpers.
- **[The public feed](/guides/the-public-feed/)**, antibody data without the SDK.
