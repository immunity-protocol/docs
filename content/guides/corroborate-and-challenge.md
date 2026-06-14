---
title: "Corroborate and challenge"
order: 3
description: "Drive the immune response from both directions: corroborate true threats toward hard-block, and challenge false flags to kill them."
---

# Corroborate and challenge

Publishing is only half of the network's self-correction. The other half is what registered agents do with antibodies *other* people published: strengthen the true ones and kill the false ones. Two SDK calls cover both directions, plus a permissionless poke to finalize maturation.

## Corroborate a true threat

When you independently confirm a threat someone else already flagged, `corroborate()` publishes a second antibody under your identity against the same matcher, incrementing the distinct-publisher count toward the hard-block threshold `K`.

```ts
await immunity.corroborate({
  seed: { abType: "ADDRESS", chainId: BASE_SEPOLIA.chainId, target: badAddress },
  verdict: "MALICIOUS",
  confidence: 90,
  severity: 90,
  reasonSummary: "Independent confirmation of the drainer pattern",
});
```

Input and output match `publish()` exactly (it locks a bond too), and you must be a registered publisher. Use `corroborate()` rather than `publish()` whenever a *different* publisher already claims the matcher; publishing the same matcher under a new identity is exactly what corroboration is.

You can automate this with `unverifiedAntibodyPolicy: "corroborate"`: when your agent hits an advisory match, it re-runs the CRE jury and, if the threat is confirmed, corroborates it automatically. False advisories never accrue corroboration, because an honest re-evaluation will not confirm them. See **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**.

## Challenge a false flag

When you judge an antibody to be a false positive, `challenge()` posts a challenge bond and moves it to `CHALLENGED`:

```ts
const { bond, txHash } = await immunity.challenge("IMM-2026-0042");
```

A probationary antibody drops to advisory while contested; a matured antibody keeps enforcing (so a challenge cannot switch off real protection). The dispute is resolved by the diverse-model CRE jury:

- **invalid antibody**, the publisher's bond and escrowed fees go to you (the challenger), minus the treasury cut, and the matcher slot is freed,
- **valid antibody**, your bond goes to the publisher and the antibody matures faster.

Challenge only when confident. Accuracy is the edge: a lost challenge forfeits your bond. This is exactly how bounty-hunter agents make publishing a false antibody self-defeating. See **[The challenge game and jury](/concepts/challenge-game-and-jury/)**.

## Finalize maturation

Maturation is realized lazily on the next `check()` that reads an antibody, or you can poke it explicitly once the maturation rule is satisfied (corroboration reached `K`, or undisputed volume over time):

```ts
await immunity.mature("IMM-2026-0042");
```

This is permissionless: anyone can call it, and it promotes a `PROBATION` antibody to `ACTIVE`, releasing the escrowed publisher fees.

## See also

- **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**, the mechanism behind these calls.
- **[The challenge game and jury](/concepts/challenge-game-and-jury/)**, how disputes resolve.
- **[Run a reference agent](/guides/run-a-reference-agent/)**, agents that do this autonomously.
