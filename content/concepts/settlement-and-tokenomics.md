---
title: "Settlement and tokenomics"
order: 4
description: "How money moves on every check, every publish, and every match. The 0.002 USDC fee, the 80/20 split, the 1 USDC stake locked 72h."
---

# Settlement and tokenomics

The protocol's economic loop is small enough to fit in your head:

- **Per check**, agents pay **$0.002 USDC** to the on-chain Registry.
- **Per match**, the matched antibody's publisher earns **80%** of the fee. The treasury keeps **20%**.
- **Per non-match (no antibody fired)**, the treasury keeps **100%**.
- **Per publish**, the publisher locks **1 USDC** for **72 hours**, refundable on expiry, slashable on lost challenge, rolled into rewards on a match.

That is the whole tokenomics. Everything else is mechanism.

## The flow per `check()`

```
agent calls check(tx, ctx)
        │
        ▼
SDK walks tiers; tier hits or misses
        │
        ▼
Registry.check(antibodyId, txFacts) ─── 0.002 USDC fee debited from agent's prepaid balance
        │
        ├─ antibodyId == 0 (no match)
        │       │
        │       ▼
        │   treasury += 0.002 USDC
        │
        └─ antibodyId != 0 (match)
                │
                ▼
            publisher += 0.0016 USDC (80%)
            treasury  += 0.0004 USDC (20%)
            antibody.matchCount++
            antibody.valueProtectedUsd += txFacts.valueUsd
```

The `tx` itself is **never** broadcast by the SDK. `check()` only settles the *intent*. The agent decides whether to broadcast based on `result.allowed`.

## The prepaid balance

Each agent maintains a prepaid USDC balance held by the Registry. `check()` debits the fee from it. Top up with `deposit(amount)`, withdraw with `withdraw(amount)`. Read with `balance()`.

The prepaid model removes per-check approval friction. Without it, every check would require an ERC20 `transferFrom` allowance check, doubling gas. With it, the Registry holds funds for the agent and debits internally.

## The publisher stake

`publish()` locks **1 USDC** of stake on chain. The stake unlocks under three conditions, in order of likelihood:

- **72 hours pass without a challenge**, the stake unlocks for withdrawal.
- **The antibody matches a check first**, the publisher earns 80% of the protocol fee per match. Match rewards accumulate; the stake itself unlocks on the same 72h schedule.
- **The antibody is challenged and the challenger wins**, the stake is slashed (currently sent to the treasury; in v2 it splits between treasury and challenger).

A publisher who consistently mints accurate antibodies turns the 1 USDC stake into a perpetuity. A publisher minting spam loses 1 USDC per false-positive antibody to challengers and never gets stake back.

## The challenge mechanism

Anyone can challenge a published antibody within its 72-hour stake-lock window. The challenge process today is governance-driven: a challenger files an on-chain claim, the protocol team or a designated reviewer adjudicates, the loser forfeits stake. The mechanism design will tighten in v2 with optimistic on-chain disputes.

Challenges exist to keep publishers honest. The economics work even if challenges are rare: the **threat** of being challenged disciplines publishers more than actual challenges do.

## What the treasury actually pays for

The treasury is a multisig address controlled by the protocol team. As of writing, accumulated balance funds:

- **0G Compute charges**, every TEE inference paid in OG.
- **Hosting and indexing**, Fly machines, Postgres for the public feed indexer, Moralis for token pricing.
- **Bounties**, occasional rewards for high-value antibody publications and for the public feed dashboard.
- **Audit costs**, contract audits, key rotation overhead.

You can read the live treasury balance from the Registry's `treasuryBalance()` view. It compounds with every settled non-match check.

## What the protocol does **not** charge for

- **Cache hits.** Tier 1 hits still settle on chain (and pay the fee), but the SDK does not double-bill for cache lookups.
- **Reads of the Registry.** Anyone can call `getAntibody`, `firstMatch`, `getAllServices` from any RPC client, no balance required. This is how third-party wallet UIs and security researchers consume the public feed without an SDK install.
- **Gossip subscription.** AXL is peer-to-peer; running a subscriber costs only your own bandwidth.

## What the SDK does **not** do (yet)

- **Sponsored gas.** Agents pay 0G gas in OG today. A v2 paymaster pattern that lets agents pay the protocol fee in USDC and the gas implicitly is on the roadmap. See the public RFC for the design.
- **Cross-chain settlement.** The Registry is on 0G Chain. ADDRESS antibodies are mirrored to other chains for hook-based protection (see [Cross-chain mirror](/concepts/cross-chain-mirror/)), but settlement always happens on 0G.

## See also

- **[Three-tier lookup](/concepts/three-tier-lookup/)**, the per-check decision flow.
- **[Antibodies](/concepts/antibodies/)**, the lifecycle of a published antibody.
- **[Network: economics](/network/economics/)**, real measured numbers from the live demo.
