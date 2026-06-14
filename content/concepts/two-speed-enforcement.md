---
title: "Two-speed enforcement"
order: 2
description: "Immunity separates propagation (instant, always) from enforcement (trust-gated). The same antibody can warn or hard-block depending on who published it and how corroborated it is."
---

# Two-speed enforcement

This is the central design idea in Immunity. Older threat-sharing designs conflate two things that need to move at different speeds:

- **Propagation** must be instant, so a real threat protects the network the moment it is seen.
- **Enforcement** must be earned, so a cheap actor cannot censor honest activity by publishing a false flag.

Immunity splits them.

## The two speeds

**Information propagates instantly, always.** An antibody is visible network-wide the moment it is published to the Registry. Every agent can see it, log it, and surface it.

**Enforcement authority is trust-gated.** Whether an antibody actually *hard-blocks* an action or only *warns* (advisory) is a separate, read-side decision derived from:

- the publisher's on-chain **reputation**,
- the antibody's **maturity** (probation vs active),
- how many independent reputable publishers **corroborate** the same matcher,
- the target's **prominence** (a blue-chip or a young frontier address gets extra protection).

This dissolves the speed/safety tension. A trusted, corroborated antibody against a normal target gets fast hard protection. A lone, low-reputation publisher flagging a blue-chip gets advisory-only, which censors nobody, while the information still propagates for anyone who wants to act on it.

## Advisory vs hard-block

Every matched antibody resolves to one of three enforcement tiers, computed on the read side by `classifyEnforcement`:

| Tier | When | Effect |
|---|---|---|
| `hard-block` | `(corroboration >= K or genesis-seeded)` **and** the target is not protected | the SDK blocks the action |
| `advisory` | eligible for enforcement but `corroboration < K`, **or** the target is in the protected set | governed by `unverifiedAntibodyPolicy` |
| `none` | the antibody is `SLASHED`, `EXPIRED`, or past its TTL | ignored |

`K` is the corroboration threshold read from the Registry. A genesis-seeded corpus entry hard-blocks without waiting for corroboration; everything else must earn it. A **protected** target is capped at advisory even when corroboration clears `K`, so no antibody can hard-block the canonical USDC, WETH, or a major router.

## What you do with an advisory

A hard-block is acted on automatically. An advisory is yours to govern with `unverifiedAntibodyPolicy`:

| Policy | Behavior on an advisory match |
|---|---|
| `ignore` | take no protective action (allow), but still settle the fee |
| `escalate` (typical) | surface to your `onEscalate` handler for an operator decision |
| `block` | act on advisories as if they were hard-blocks (paranoid) |
| `corroborate` | re-verify the advisory through the CRE jury and, if confirmed, publish your own corroborating antibody to strengthen the signal |

`corroborate` is the organic maturation engine: the agents actually being targeted re-verify true threats and push them toward hard-block, while false advisories never accrue corroboration because honest re-evaluations will not confirm them. See **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**.

## Why this is the strongest single fix

The worst attack on a threat network is a cheap actor flagging a genuine address to deny real activity. Two-speed enforcement neuters it: a lone low-reputation flag is advisory-only, and a protected target can never be hard-blocked at all. Combined with bonded identity and the challenge game, the attacker pays and loses while honest activity is never censored. The full attacker math is in **[Sybil resistance](/concepts/sybil-resistance/)**.

## See also

- **[Sybil resistance](/concepts/sybil-resistance/)**, the attack this defends against and the rest of the toolkit.
- **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**, how an antibody earns hard-block.
- **[Reference: helpers](/reference/helpers/)**, `classifyEnforcement` and `EnforcementResolver`.
