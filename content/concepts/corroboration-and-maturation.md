---
title: "Corroboration and maturation"
order: 4
description: "How an antibody earns hard-block: independent publishers corroborating one matcher, or undisputed matched volume over time."
---

# Corroboration and maturation

A published antibody starts on **probation**, advisory-only. It becomes enforceable only by earning positive signal. Two mechanisms drive that: corroboration and maturation.

## Many antibodies, one target

The Registry does not give the first publisher of a target an exclusive claim. A target's `primaryMatcherHash` maps to a **set** of antibodies (`matcherHash -> keccakId[]`), with distinct-publisher tracking. When two different publishers flag the same address, they create two antibodies that share one matcher hash but have different `keccakId`s (the `keccakId` includes the publisher).

This multi-antibody model does two things at once:

- it enables **corroboration**, the count of distinct reputable publishers behind a matcher, and
- it removes the front-running rent-extraction problem, where a first claimant could squat a matcher and collect everyone else's fees.

`check()` aggregates across all live antibodies for a target and derives the enforcement tier from the distinct-reputable-publisher count.

## Corroboration-gated hard-block

Hard-block requires `corroboration >= K`, where `K` is the corroboration threshold read from the Registry. Until then the antibody is advisory: it propagates and warns, but it does not block honest activity. This is what makes a single compromised or rogue key unable to censor anything. See **[Sybil resistance](/concepts/sybil-resistance/)**.

A genesis-seeded corpus entry (`isSeeded`) is the one exception: it hard-blocks without waiting for corroboration, because the genesis set is disclosed and audited.

## Maturation

Maturation is the transition `PROBATION -> ACTIVE`. It happens on positive signal, never on mere survival:

- **corroboration reaches `K`**, or
- **undisputed matched volume accrues over time**, real checks matched the antibody and nobody successfully challenged it.

On maturation the antibody's escrowed publisher fees release. Before maturation those fees are held in escrow and clawed back if the antibody is slashed, so a false antibody that matured incorrectly cannot have already been paid.

Maturation is realized either by a permissionless `mature(antibodyId)` poke once the rule is satisfied, or lazily the next time the antibody is read on a `check()`.

## Corroborating from the SDK

Any registered publisher can strengthen a true threat with `corroborate()`:

```ts
await immunity.corroborate({
  seed: { abType: "ADDRESS", chainId: BASE_SEPOLIA.chainId, target: badAddress },
  verdict: "MALICIOUS",
  confidence: 90,
  severity: 90,
  reasonSummary: "Independent confirmation of the drainer pattern",
});
```

This publishes a second antibody under your identity against the same matcher, incrementing the distinct-publisher count toward `K`. It is the opposite end of the immune response from the hunter: **hunters challenge and kill false advisories; corroborators verify and promote true ones**, both driven by independent evaluation.

The `corroborate` value of `unverifiedAntibodyPolicy` automates this: when your agent hits an advisory match, it re-runs the CRE jury and, if the threat is confirmed, publishes a corroborating antibody. False advisories never accrue corroboration, because an honest re-evaluation will not confirm them.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, advisory vs hard-block.
- **[The challenge game and jury](/concepts/challenge-game-and-jury/)**, the other direction of the immune response.
- **[Corroborate and challenge](/guides/corroborate-and-challenge/)**, the SDK calls in practice.
