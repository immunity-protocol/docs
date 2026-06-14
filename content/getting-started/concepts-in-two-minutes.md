---
title: "Concepts in two minutes"
order: 3
description: "The smallest mental model that explains what every other page assumes."
---

# Concepts in two minutes

Read this once. The rest of the docs assume you know it.

## The protocol

Immunity is a network of AI agents that share threat intelligence. When one agent detects something bad, it publishes an **antibody** to an on-chain Registry on **Base**. The Registry is the canonical record, so every other agent sees the antibody the moment it lands. Each agent keeps a local cache hydrated from the chain, so the next time any agent encounters the same threat it matches locally in microseconds.

There is no gossip daemon and no separate compute service. Propagation is on-chain; the cache is a shortcut over it.

## Two-speed enforcement

The single most important idea. Immunity separates two things that older designs conflated:

- **Propagation is instant and unconditional.** An antibody is visible network-wide as soon as it is published.
- **Enforcement is trust-gated.** Whether an antibody actually *hard-blocks* or only *warns* depends on the publisher's on-chain reputation, the antibody's maturity, how many independent publishers corroborate it, and how prominent the target is.

A trusted, corroborated antibody against a normal target hard-blocks. A lone, low-reputation publisher flagging a blue-chip address gets advisory-only, which censors nobody. See **[Two-speed enforcement](/concepts/two-speed-enforcement/)**.

## The five antibody types

Each antibody declares what it matches:

- **ADDRESS**, specific wallets and contracts (drainers, mixers, sanctioned addresses).
- **CALL_PATTERN**, function shapes (`approve(MAX, drainer)`, `setApprovalForAll(true, kit)`).
- **BYTECODE**, runtime hash, catches re-deployed clones across chains.
- **GRAPH**, multi-hop taint (funded via a mixer within 24h).
- **SEMANTIC**, the agent-native threats: prompt injection, manipulation, malicious counterparties.

## The three-tier lookup

Every `check()` walks three tiers, cheapest first:

```
Tier 1, local cache         ~1 ms      the vast majority of checks
Tier 2, Base registry RPC   ~200 ms    cache miss, chain knew about it
Tier 3, CRE jury            seconds    genuinely new, cache and chain both miss
```

The chain is the source of truth. The cache is a shortcut on top of it. The CRE jury only fires when both miss, and only if you opt in via `novelThreatPolicy: "verify"`.

## Sybil resistance in one breath

The worst attack is a cheap actor flagging a *genuine* address to censor real activity. Immunity defeats it with bonded ENS identities (the sybil cost), non-refundable slashable bonds that scale with severity and target prominence, corroboration-gated hard-block (no single identity hard-blocks alone), a protected set for blue-chips, and a challenge game where bounty hunters profit by killing false flags. The attacker always loses bond and reputation. See **[Sybil resistance](/concepts/sybil-resistance/)**.

## What it costs

A check that reaches the chain (a match settlement, or a CRE verification under `verify`) draws a fee from your prepaid USDC balance. A pure cache or registry miss under `trust-cache`/`deny-novel` makes no on-chain call and costs nothing. Publishing locks a bond sized to the claimed severity and target prominence.

## Where to go next

- The hands-on path: **[Quickstart](/getting-started/quickstart/)**.
- The deep dive: **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, **[Sybil resistance](/concepts/sybil-resistance/)**, **[The challenge game and jury](/concepts/challenge-game-and-jury/)**.
- The reference: **[Immunity class](/reference/immunity-class/)**, **[ImmunityConfig](/reference/immunityconfig/)**.
