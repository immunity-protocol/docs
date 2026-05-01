---
title: "Antibodies"
order: 1
description: "What an antibody is, how it lives on chain, and the lifecycle from publish through expiry or slash."
---

# Antibodies

An **antibody** is the network's atomic unit of threat intelligence. One antibody corresponds to one specific thing the network has decided is dangerous. Every published antibody lives on the on-chain Registry on 0G Chain. The Registry is the canonical source of truth; every other layer (cache, gossip, off-chain feeds) is a derivative view.

## Identity

Each antibody has three identifiers:

- **`keccakId`**, a 32-byte hex string. The on-chain primary key. Computed from `(abType, flavor, primaryMatcherHash, publisher)`.
- **`immSeq`**, a sequential `uint64` integer assigned at publish time. Monotonic across the whole Registry.
- **`immId`**, the human-readable form, `IMM-YYYY-NNNN` (year + four-digit pad). Derived from `immSeq` and `createdAt`. Stable for life.

You read by either form. The SDK exposes `getAntibody(keccakId | immSeq)` and `getAntibodyByImmSeq(seq)`.

## On-chain shape

The full envelope:

```ts
interface Antibody {
  keccakId:           Hex32;
  immSeq:             number;
  immId:              string;          // "IMM-2026-0042"
  abType:             AntibodyType;    // ADDRESS | CALL_PATTERN | BYTECODE | GRAPH | SEMANTIC
  flavor:             number;          // type-specific subtype
  verdict:            Verdict;         // MALICIOUS | SUSPICIOUS
  status:             Status;          // ACTIVE | CHALLENGED | SLASHED | EXPIRED
  confidence:         number;          // 0..100
  severity:           number;          // 0..100
  primaryMatcherHash: Hex32;
  evidenceCid:        Hex32;           // 0G Storage pointer for the evidence bundle
  contextHash:        Hex32;
  embeddingHash:      Hex32;
  attestation:        Hex32;           // TEE attestation, when applicable
  publisher:          Address;
  reviewer:           Address;
  stakeAmount:        bigint;          // 1 USDC by default, in 6-decimal base units
  stakeLockUntil:     bigint;          // unix timestamp
  expiresAt:          bigint;          // 0 in v1 (treated as permanent)
  createdAt:          bigint;
  isSeeded:           boolean;
  seed?:              AntibodySeed;    // off-chain matcher seed for cache reconstruction
}
```

Most fields are derived. The interesting ones at read time are `abType`, `verdict`, `status`, `confidence`, and `immId`.

## Lifecycle

```
   Publisher mints
        │
        ▼
    ┌─ ACTIVE ─────────────────────────────────────┐
    │                                              │
    │  1. Stake locked 72h.                        │
    │  2. Eligible to match check() calls.         │
    │  3. Match earns publisher 80% of fee.        │
    │                                              │
    │  Anyone can challenge in this window.        │
    └──────────────────────────────────────────────┘
                         │
                         │ (challenge filed)
                         ▼
                    CHALLENGED
                         │
            ┌────────────┴────────────┐
            │                         │
        challenge wins            challenge loses
            │                         │
            ▼                         ▼
         SLASHED                    ACTIVE
        (stake forfeit)          (challenger forfeits)
                                     │
                                     │ (72h pass without challenge,
                                     │  or after a successful match)
                                     ▼
                                  ACTIVE permanently,
                                  stake unlocked,
                                  withdrawable.
```

`EXPIRED` is reserved for v2. v1 treats every antibody as permanent (`expiresAt = 0` always). The contract exposes the field so the SDK can flip a flag in v2 without a redeploy.

## Verdicts

`verdict` is the publisher's classification. Two values:

- **`MALICIOUS`**, the action should always block.
- **`SUSPICIOUS`**, the action *might* be bad. The SDK invokes the operator-in-the-loop `onEscalate` handler when matched antibodies are SUSPICIOUS and confidence falls in the escalate band.

`status` is what's currently true on chain. ACTIVE means the antibody is matching live. SLASHED, EXPIRED, and CHALLENGED hide the antibody from match-time lookups but it stays addressable for audit.

## Confidence and severity

Both 0-100 integers, both publisher-asserted at publish time. Confidence drives the SDK's escalate logic via `confidenceThresholds` (defaults: block at 85, escalate at 60). Severity is informational, used by UIs and feeds to surface the worst threats first.

## Why every antibody has a stake

The stake is the protocol's economic skin in the game. A publisher who mints a false-positive ADDRESS antibody for a legitimate exchange wallet gets challenged, loses the stake, and forfeits future match rewards from that antibody. A publisher who mints accurate antibodies earns 80% of the fee on every match across the network for the life of the antibody.

The 1 USDC default is small enough that good-faith publishers can mint dozens, large enough to deter low-quality spam. Governance can adjust per-type defaults later.

## Off-chain enrichment

Two off-chain pieces complete the picture:

- **`evidenceCid`** points at a 0G Storage blob carrying the evidence bundle (the original tx, the marker text, the chain log, whatever the publisher chose to seal). Public envelope by default; encryptable for sensitive seeds.
- **`seed`** (optional) is the matcher reconstruction seed: the data subscribers need to rebuild a type-specific lookup locally without re-reading the chain. Gossiped alongside the antibody when the publisher includes it.

## See also

- **[Three-tier lookup](/concepts/three-tier-lookup/)**, how an antibody actually gets matched.
- **[Settlement and tokenomics](/concepts/settlement-and-tokenomics/)**, the publish + check + reward flow.
- **[Reference: Antibody](/reference/antibody/)**, every field with its on-chain mapping.
