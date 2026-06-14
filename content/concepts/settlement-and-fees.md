---
title: "Settlement and fees"
order: 9
description: "How money moves on every check and publish: the fee pays for the evaluation, hits reward the publisher, bonds are non-refundable, and fees escrow until maturation."
---

# Settlement and fees

The economic loop is designed so the fee always pays for *evaluation*, and so a false antibody can never earn. Two assets move: a per-check **fee** and a per-publish **bond**.

## The fee pays for the evaluation

The antibody network is a cache that monetizes hits. When a `check()` reaches the chain, it settles a fee, and where that fee goes depends on whether the threat was already known:

- **Miss (novel), under `verify`.** No antibody covers the action, so the SDK must run the **CRE jury** to evaluate it. The on-chain `requestVerification` carries the fee, which funds that compute; the fee goes to the treasury (which funds CRE). A confirmed novel threat seeds a new antibody, a future cache entry.
- **Hit (an antibody covers it).** The evaluation was already done, so there is no LLM to run. The fee splits **80% to the publisher, 20% to the treasury**, the reward for the cache entry that saved an inference. The publisher share is paid **directly** if the matched antibody is matured/`ACTIVE`, or **escrowed** if it is still advisory/`PROBATION`.

The flywheel: more good antibodies, more cache hits, less compute burned, more publisher reward, more good antibodies.

A check that makes no on-chain call settles nothing. A pure cache/registry miss under `trust-cache` or `deny-novel` is decided locally by policy, so `checkId` is `null` and no fee is charged. `unverifiedAntibodyPolicy` governs what your agent *does* with an advisory match, not whether a fee is charged.

## The flow per `check()`

```
agent calls check(tx, ctx)
        │
        ▼
SDK walks Tier 1 (cache) then Tier 2 (registry)
        │
        ├─ hit ──────────────► Registry settles the fee
        │                        matured publisher += 80%  (or escrow if advisory)
        │                        treasury           += 20%
        │
        └─ miss ──────────────► policy decides
                                 verify       → requestVerification (fee → treasury, funds CRE)
                                 trust-cache  → allow, novel:true, no chain call, no fee
                                 deny-novel   → block, no chain call, no fee
```

The `tx` itself is **never** broadcast by the SDK. `check()` settles only the intent; the agent decides whether to broadcast based on `result.allowed`.

## The prepaid balance

Each wallet maintains a prepaid USDC balance held by the Registry. Settlement debits the fee from it. Top up with `deposit(amount)`, pull funds with `withdraw(amount)`, read with `balanceOf()`. The prepaid model removes a per-check ERC20 approval round-trip.

## The publisher bond

`publish()` locks a **non-refundable, slashable bond**, sized `base x severityFactor x prominenceFactor` (not a flat amount). The bond stays at risk the entire time the antibody is enforced:

- released only on **clean expiry or retirement** (no open or pending challenge),
- **forfeited on slash**, routed to the challenger and treasury.

A publisher who flags accurate threats turns the bond into a fee stream. A publisher minting spam loses the bond per false antibody and earns nothing. See **[Sybil resistance](/concepts/sybil-resistance/)**.

## Fees escrow until maturation

A probation antibody's publisher fee share is **escrowed**, not paid. It releases on **maturation** (corroboration reaches `K`, or undisputed matched volume over time) and is **clawed back on slash**. So an antibody that matched checks before being killed earns its publisher exactly zero. See **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**.

## What the treasury pays for

The treasury accumulates the protocol cut and the full fee on novel evaluations. It funds:

- **CRE compute**, every jury evaluation,
- **hosting and indexing**, the public-feed indexer and explorer,
- **audits**, contract audits and key rotation,
- **bounties**, occasional rewards for high-value publications.

## What the protocol does not charge for

- **Reads of the Registry.** Anyone can read antibodies and enforcement state from any RPC client, no balance required. This is how wallet UIs and researchers consume the network without an SDK install.
- **Local policy decisions.** A cache/registry miss resolved by `trust-cache`/`deny-novel` makes no chain call and costs nothing.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, why advisory matches escrow instead of pay.
- **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**, when escrow releases.
- **[Network: economics](/network/economics/)**, measured numbers from the live Base Sepolia deployment.
