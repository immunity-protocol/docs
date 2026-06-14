---
title: "Antibodies"
order: 1
description: "What an antibody is, how it lives on chain, and the lifecycle from publish through maturation, expiry, or slash."
---

# Antibodies

An **antibody** is the network's atomic unit of threat intelligence. One antibody corresponds to one specific thing the network has decided is dangerous. Every published antibody lives on the on-chain Registry on **Base**. The Registry is the canonical source of truth; every other layer (the local cache, off-chain feeds) is a derivative view.

## Identity

Each antibody has three identifiers:

- **`keccakId`**, a 32-byte hex string. The on-chain primary key. Computed from `(abType, flavor, primaryMatcherHash, publisher)`.
- **`immSeq`**, a sequential integer assigned at publish time. Monotonic across the whole Registry.
- **`immId`**, the human-readable form, `IMM-YYYY-NNNN` (year + four-digit pad). Derived from `immSeq` and `createdAt`. Stable for life.

Because the `keccakId` includes the publisher, two different publishers who flag the **same** target produce two different antibodies that share one `primaryMatcherHash`. That is corroboration, and it is what drives an antibody toward hard-block. See **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**.

## On-chain shape

The full envelope:

```ts
interface Antibody {
  keccakId:           Hex32;
  immSeq:             number;
  immId:              string;          // "IMM-2026-0042"
  abType:             AntibodyType;    // ADDRESS | CALL_PATTERN | BYTECODE | GRAPH | SEMANTIC
  flavor:             number;          // type-specific subtype (SEMANTIC only)
  verdict:            Verdict;         // MALICIOUS | SUSPICIOUS
  status:             Status;          // PROBATION | ACTIVE | CHALLENGED | SLASHED | EXPIRED
  confidence:         number;          // 0..100
  severity:           number;          // 0..100, scales the bond
  primaryMatcherHash: Hex32;
  evidenceCid:        Hex32;           // IPFS content hash (Lighthouse) for the evidence bundle
  contextHash:        Hex32;           // IPFS hash of the ECIES-encrypted context
  embeddingHash:      Hex32;
  attestation:        Hex32;           // CRE attestation, when published from a verdict
  publisher:          Address;
  reviewer:           Address;
  bondAmount:         bigint;          // non-refundable bond, locked while enforced (USDC, 6dp)
  escrowedFees:       bigint;          // publisher fees held until maturation (USDC, 6dp)
  maturedAt:          bigint;          // unix seconds the antibody became ACTIVE; 0 if not matured
  expiresAt:          bigint;          // unix seconds TTL; 0 = permanent
  createdAt:          bigint;
  isSeeded:           boolean;         // genesis-seeded corpus entry
  prominenceTier:     number;          // 0 normal, >= 1 protected target
  seed?:              AntibodySeed;    // off-chain matcher seed for cache reconstruction
}
```

The interesting fields at read time are `abType`, `verdict`, `status`, `confidence`, `prominenceTier`, and `immId`.

## Lifecycle

A published antibody starts on probation and earns its way to enforcement. It never starts out trusted.

```
  publish
     │   (bond locked, fees escrowed)
     ▼
  PROBATION ──────────────── advisory only; warns, never hard-blocks
     │
     │  matures with positive signal:
     │  corroboration >= K, OR undisputed matched volume + time
     ▼
   ACTIVE ───────────────── enforcement strength per the two-speed rule;
     │                        escrowed fees release to the publisher
     │
     │  anyone may challenge at any point
     ▼
  CHALLENGED ────────────── probationary drops to advisory;
     │                        a matured antibody KEEPS enforcing
     ├─ invalid → SLASHED   bond + escrow clawed back to challenger; matcher slot freed
     └─ valid   → ACTIVE    challenger's bond goes to the publisher; matures faster
```

`EXPIRED` is reached when `expiresAt` passes. An antibody with `expiresAt = 0` is permanent. Maturation and challenge resolution are covered in **[Corroboration and maturation](/concepts/corroboration-and-maturation/)** and **[The challenge game and jury](/concepts/challenge-game-and-jury/)**.

## Verdicts vs status

`verdict` is the publisher's classification:

- **`MALICIOUS`**, the action should block when this antibody is enforcing.
- **`SUSPICIOUS`**, the action *might* be bad. The SDK invokes the operator-in-the-loop `onEscalate` handler when matched antibodies are SUSPICIOUS and confidence falls in the escalate band.

`status` is what is currently true on chain. `PROBATION` and `ACTIVE` are live (they surface from lookups so the read-side can classify them advisory or hard-block). `SLASHED` and `EXPIRED` are dead and never match. `CHALLENGED` still surfaces but with reduced authority.

## Confidence and severity

Both are 0-100 integers, publisher-asserted at publish time. Confidence drives the SDK's escalate logic via `confidenceThresholds` (defaults: block at 85, escalate at 60). **Severity scales the bond**: a higher claimed severity costs the publisher a larger non-refundable bond, so over-claiming is expensive.

## Why every antibody has a bond

The bond is the protocol's economic skin in the game, and it is **non-refundable while the antibody is enforced**. A publisher who flags a legitimate exchange wallet gets challenged, loses the bond and the escrowed fees, and earns nothing. A publisher who flags accurate threats earns a share of the fee on every match for the life of the antibody, released once the antibody matures.

The bond scales with claimed severity and the target's prominence, so flagging a blue-chip address (or any young, low-volume address on the frontier) costs more. This is the core of **[sybil resistance](/concepts/sybil-resistance/)**.

## Off-chain enrichment

Two off-chain pieces complete the picture:

- **`evidenceCid`** points at a Lighthouse (Filecoin/IPFS) object carrying the public evidence envelope (the matcher summary, the reason, the attestation). Anchored on-chain as a content hash so anyone can fetch and verify it. Sensitive context is uploaded separately as an ECIES-encrypted blob keyed by `contextHash`.
- **`seed`** (optional) is the matcher reconstruction seed: the data subscribers need to rebuild a type-specific lookup locally without re-reading the chain.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, how a matched antibody becomes advisory or hard-block.
- **[Three-tier lookup](/concepts/three-tier-lookup/)**, how an antibody actually gets matched.
- **[Reference: Antibody](/reference/antibody/)**, every field with its on-chain mapping.
