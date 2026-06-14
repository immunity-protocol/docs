---
title: "Antibody"
order: 4
description: "Every field on the on-chain Antibody envelope, the contract-aligned shape plus the off-chain seed for cache reconstruction."
---

# `Antibody`

The contract-aligned envelope for a published threat. One per `keccakId`. Returned in `CheckResult.antibodies` on a match, and decodable from the Registry with the `decodeAntibody` helper.

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
  bondAmount:         bigint;
  escrowedFees:       bigint;
  maturedAt:          bigint;
  expiresAt:          bigint;
  createdAt:          bigint;
  isSeeded:           boolean;
  prominenceTier:     number;
  seed?:              AntibodySeed;
}
```

## Identity

### `keccakId`

Type: `Hex32`. The on-chain primary key:

```
keccakId = keccak256(abi.encode(abType, flavor, primaryMatcherHash, publisher))
```

Because it includes the publisher, two publishers flagging the same target produce two `keccakId`s sharing one `primaryMatcherHash`. Compute it with `computeKeccakId`.

### `immSeq`

Type: `number`. Sequential, monotonic across the Registry.

### `immId`

Type: `string`. Format `IMM-YYYY-NNNN`. The human-readable form, used in URLs, logs, and the public feed. Build it with `formatImmId(year, immSeq)`.

## Classification

### `abType`

Type: `AntibodyType`. `"ADDRESS" | "CALL_PATTERN" | "BYTECODE" | "GRAPH" | "SEMANTIC"`. Numeric codes are in `AntibodyTypeValue`.

### `flavor`

Type: `number`. Type-specific subtype. For SEMANTIC it is a `SemanticFlavor` code (`COUNTERPARTY=0`, `MANIPULATION=1`, `PROMPT_INJECTION=2`); `0` for other types.

### `verdict`

Type: `Verdict`. `"MALICIOUS"` (block when enforcing) or `"SUSPICIOUS"` (escalate band).

### `status`

Type: `Status`. Current on-chain state:

- `"PROBATION"`, freshly published; advisory-only, fees escrowed.
- `"ACTIVE"`, matured; enforcement strength per the two-speed rule, escrow released.
- `"CHALLENGED"`, a challenge is pending; probationary suspends to advisory, matured keeps enforcing.
- `"SLASHED"`, challenge succeeded; disabled, bond forfeited.
- `"EXPIRED"`, past its TTL; disabled.

`PROBATION` and `ACTIVE` are *live* and surface from lookups; `SLASHED` and `EXPIRED` never match. Use `isLiveAntibody(ab, nowSec)` to test liveness.

### `confidence` / `severity`

Type: `number`, 0..100. Publisher-asserted. Confidence drives escalate logic; **severity scales the bond**.

## Matcher data

### `primaryMatcherHash`

Type: `Hex32`. The keccak256 of the type-specific matcher tuple, used as the on-chain lookup index. Computed by the per-type helpers, each taking a typed input object. See [Matchers and seeds](/reference/matchers/).

### `evidenceCid`

Type: `Hex32`. The IPFS content hash (pinned to Lighthouse) of the public evidence envelope, stored on chain as a 32-byte digest. Convert to a CID string with `hex32ToCid`, fetch with `fetchPublicEnvelope`.

### `contextHash`

Type: `Hex32`. IPFS hash of the ECIES-encrypted sensitive context, when the publisher supplied one. Decryptable only by the CRE oracle.

### `embeddingHash`

Type: `Hex32`. SEMANTIC-only; reserved for similarity search. Zero otherwise.

### `attestation`

Type: `Hex32`. The CRE/DON attestation commitment when the antibody was published from a verdict. Zero for manual publishes.

## Provenance and economics

| Field | Type | Meaning |
|---|---|---|
| `publisher` | `Address` | the registered identity that published |
| `reviewer` | `Address` | optional designated reviewer; defaults to the publisher |
| `bondAmount` | `bigint` | the non-refundable bond locked while enforced (USDC, 6dp) |
| `escrowedFees` | `bigint` | publisher fees held until maturation (USDC, 6dp) |
| `maturedAt` | `bigint` | unix seconds the antibody matured; `0` if not matured |
| `expiresAt` | `bigint` | unix seconds TTL; `0` = permanent |
| `createdAt` | `bigint` | unix seconds of the publish tx |
| `prominenceTier` | `number` | `0` normal, `>= 1` protected target |

## Off-chain enrichment

### `isSeeded`

Type: `boolean`. `true` for genesis-seeded corpus entries, which hard-block without waiting for corroboration.

### `seed`

Type: `AntibodySeed` (discriminated union by `abType`). Optional. The matcher reconstruction seed subscribers use to rebuild a type-specific lookup without re-reading the chain. Absent on antibodies hydrated directly from chain reads. See [Matchers and seeds](/reference/matchers/).

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the lifecycle picture.
- **[Matchers and seeds](/reference/matchers/)**, the seed shapes and matcher-hash helpers.
- **[The public feed](/guides/the-public-feed/)**, antibody data without the SDK.
