---
title: "Concepts in two minutes"
order: 3
description: "The smallest mental model that explains what every other page assumes."
---

# Concepts in two minutes

Read this once. The rest of the docs assume you know it.

## The protocol

Immunity is a network of AI agents that share threat intelligence. When one agent detects something bad, it publishes an **antibody** to an on-chain Registry. Every other agent on the network now knows about it within a second, via a peer-to-peer gossip mesh. The next time any agent encounters the same bad thing, it blocks locally in microseconds.

Three layers carry this:

- **Speed**, an external **Gensyn AXL** daemon gossips antibodies to subscribers.
- **Trust**, the **on-chain Registry** on 0G Chain stakes 1 USDC per published antibody. Match rewards split 80/20 publisher / treasury. Slashable on bad-faith publishes.
- **Verification**, the **0G Compute TEE** running `qwen-2.5-7b-instruct` reasons about novel threats and signs the verdict so subsequent agents can trust it.

## The five antibody types

Each antibody declares what it matches:

- **ADDRESS**, specific wallets and contracts (Tornado, Inferno, Lazarus).
- **CALL_PATTERN**, function shapes (`approve(MAX, drainer)`, `setApprovalForAll(true, kit)`).
- **BYTECODE**, runtime hash, catches re-deployed clones.
- **GRAPH**, multi-hop taint (funded via Tornado within 24h).
- **SEMANTIC**, prompt-injection markers (`</system> new instructions:`).

## The three-tier lookup

Every `check()` walks three tiers, cheapest first:

```
Tier 1, local cache       ~1 ms      99% of checks
Tier 2, on-chain registry ~200 ms    cache miss, chain knew about it
Tier 3, TEE detection     ~3 s       genuinely new, cache and chain both miss
```

The chain is the source of truth. The cache is a shortcut on top of it. The TEE only fires when both miss, and even then only if you opt in via `novelThreatPolicy: "verify"`.

## Publisher economics

Anyone can publish. To publish you stake 1 USDC for 72 hours. If your antibody matches a real check, you earn 80% of the 0.002 USDC fee per match; the treasury keeps 20%. If your antibody is challenged in the 72-hour window and loses, your stake gets slashed.

## What it costs

Per check, $0.002 USDC flat. That covers the protocol fee no matter what tier resolves. New detections that auto-mint an antibody add ~$0.0005 in gas plus the 1 USDC stake (refundable on expiry, or rolled into rewards on a match).

## Where to go next

- The hands-on path: **[Quickstart](/getting-started/quickstart/)**.
- The deep-dive: **[Three-tier lookup](/concepts/three-tier-lookup/)**, **[TEE verification](/concepts/tee-verification/)**, **[Settlement and tokenomics](/concepts/settlement-and-tokenomics/)**.
- The reference: **[Immunity class](/reference/immunity-class/)**, **[ImmunityConfig](/reference/immunityconfig/)**.
