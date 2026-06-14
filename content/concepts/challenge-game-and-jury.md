---
title: "The challenge game and jury"
order: 7
description: "Anyone can challenge a false antibody. A diverse-model CRE jury resolves the dispute by 2/3 supermajority, and the losing side pays."
---

# The challenge game and jury

The challenge game is how the network corrects itself. It turns killing a false antibody into a profitable action, so false flags get hunted down instead of lingering.

## Initiating a challenge

Anyone calls `challenge(antibodyId)` and posts a challenge bond scaled to the antibody's strength:

```ts
const { bond, txHash } = await immunity.challenge("IMM-2026-0042");
```

The antibody enters `CHALLENGED`. Crucially:

- a **probationary** antibody drops to advisory for the duration, so a real-but-unproven flag stops blocking while contested,
- a **matured** antibody **keeps enforcing**, so an attacker cannot file a frivolous challenge to switch off genuine protection.

## Who challenges

- The flagged **victim** or the address **owner**, defending themselves.
- **Bounty-hunter agents** that scan for false positives and challenge them for profit, a permissionless immune response.

Healthy hunters are what make publishing a false antibody self-defeating. Accuracy is the hunter's edge: blind challenging loses bonds, so hunters only challenge when confident and profitable.

## Settling

The dispute resolves to one of two outcomes:

- **Invalid antibody.** The publisher's bond plus the escrowed fees go to the challenger (minus the treasury cut), the publisher's reputation is slashed, and the matcher slot is cleared so a correction can be published.
- **Valid antibody.** The challenger's bond goes to the publisher and treasury, and the antibody matures faster, which deters frivolous challenges.

## The jury (v1): diverse-model CRE

In v1 the canonical resolver is a **diverse-model Chainlink CRE jury**. A challenge runs **three CRE evaluations, each on a different model provider** (Claude / GPT / Gemini). Model diversity is the point: it defeats single-provider injection and bias far better than three runs of one model.

Each run is attested through CRE Confidential HTTP and delivered on chain via the `KeystoneForwarder` (the receiver accepts reports `onlyForwarder` for a pinned workflow id and owner). A **2/3 supermajority is canonical and final** (`supermajorityBps = 6700`). The dispute state machine is `PENDING -> RESOLVED`.

The three independent providers, DON-attested, already make this a genuinely multi-party arbiter, not a single oracle.

## Layer 2 (v2): staked verifier-agents

A second layer, a pool of staked verifier-agents voting commit-reveal with the losing side slashed, is **deferred to v2**. It is the least-testable subsystem (it needs a real independent staked-operator set), so the `VerifierPool` contract stays deployed but dormant in v1. Two safety refinements fold into the audited pre-mainnet contract pass rather than now:

1. on no 2/3 majority, resolve conservatively (no slash, bonds returned) instead of escalating, and
2. require at least two actual votes before any slash.

This is honest progressive decentralization: the CRE jury is already multi-party, and Layer 2 hardens it once a real operator set exists.

## See also

- **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**, the opposite direction of the immune response.
- **[Novel-threat verification](/concepts/novel-threat-verification/)**, the same CRE machinery used at check time.
- **[Corroborate and challenge](/guides/corroborate-and-challenge/)**, the SDK calls in practice.
