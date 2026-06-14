---
title: "Economics"
order: 3
description: "What it costs and what you earn on Base: the per-check fee, the fee split, the non-refundable bond, the treasury, and the break-even math."
---

# Economics

The protocol runs on two flows: a per-check **fee** and a per-publish **bond**. This page is the numbers view; the mechanism is in [Settlement and fees](/concepts/settlement-and-fees/). All parameters below are governance-tunable; the values are the current Base Sepolia settings.

## Per-check fee

The protocol fee is **0.002 USDC** per settled check, debited from the caller's prepaid balance. It pays for the *evaluation*:

```
settled check, fee 0.002 USDC:
  hit (an antibody covers it)  -> 80% to the publisher, 20% to the treasury
                                  (publisher share escrowed if the antibody is still advisory)
  miss under verify (CRE runs) -> 100% to the treasury, which funds the CRE compute
```

A check that makes no on-chain call (a `trust-cache`/`deny-novel` policy decision) settles nothing.

## Per-publish bond

The publish bond is **non-refundable while the antibody is enforced** and scales with the claim:

```
bond = base x severityFactor x prominenceFactor
```

Higher claimed severity, a protected blue-chip target, or a young, low-volume frontier address all raise the bond. The bond releases on clean expiry or retirement and is forfeited on slash (routed to the challenger and treasury). See [Sybil resistance](/concepts/sybil-resistance/).

## Gas

Gas is paid in ETH on Base. The contract-level gas per operation is roughly:

| Operation | Approx. gas |
|---|---|
| settle a check | tens of thousands |
| publish an antibody | a few hundred thousand (varies by type and evidence size) |
| register a publisher | a few hundred thousand (mints an ENS subname) |
| deposit / withdraw | tens of thousands |

Absolute cost is `gas x Base gas price x ETH price`. Base is an L2, so these are fractions of a cent at typical gas prices. Recompute against live gas when you need exact fiat figures.

## Treasury

The treasury accumulates the 20% cut of matched checks and the full fee on novel evaluations. It funds CRE compute, indexer and explorer hosting, audits, and bounties. The balance is publicly readable from the Registry. See [Settlement and fees](/concepts/settlement-and-fees/).

## Publisher break-even

A publisher who flags accurate threats turns the bond into a fee stream. Once an antibody matures, each match pays 0.0016 USDC (80% of the 0.002 fee). Break-even on a bond `B` is `B / 0.0016` matches; a well-targeted antibody on a frequently-encountered threat clears that quickly, and every match after is profit. A false antibody, by contrast, earns zero (escrow is clawed back on slash) and forfeits its bond.

## Why the model works

- **Spam never pays.** A false publish forfeits its bond and earns nothing, and the bond scales up exactly on the targets an attacker would want to grief.
- **Accuracy compounds.** A real, well-targeted antibody is matched repeatedly across the network; cumulative match rewards exceed the bond.
- **The treasury self-funds the network.** Every settled check pays into the treasury directly or via the split, covering the off-chain costs (CRE compute, indexer) without external grants.

## See also

- **[Settlement and fees](/concepts/settlement-and-fees/)**, the mechanism behind these numbers.
- **[Sybil resistance](/concepts/sybil-resistance/)**, the bond curve and why it scales.
- **[Network: Registry on Base](/network/registry-on-base/)**, how to read these values yourself.
