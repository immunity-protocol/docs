---
title: "Economics"
order: 3
description: "Real measured numbers from the live demo. Gas, protocol fee, treasury split, publisher rewards. What it actually costs."
---

# Economics

Numbers in this page are measured from the live demo against 0G Galileo testnet. Mainnet pricing follows the same gas economics; multiply by your live gas price for absolute numbers in fiat.

## Per-operation gas (measured)

| Operation | Gas used | Source |
|---|---|---|
| `Registry.check()` settlement | ~49,000 | live receipts, 4 ADDRESS check txs |
| Publish ADDRESS antibody | ~248,000 | live receipts, 2 publisher txs |
| Publish SEMANTIC antibody | ~282,000 | live receipts, includes seed-blob upload |
| Withdraw stake (post-72h) | ~62,000 | live receipts |
| Deposit USDC (with allowance) | ~74,000 | live receipts |
| Deposit USDC (first-time approve) | ~120,000 | first deposit only |

At 4 gwei (typical Galileo testnet) and 0G ~$0.54 (current spot):

| Operation | Cost in USDC |
|---|---|
| `Registry.check()` settlement | ~$0.0001 |
| Publish ADDRESS antibody | ~$0.0005 |
| Publish SEMANTIC antibody | ~$0.0006 |
| Withdraw stake | ~$0.00013 |
| Deposit USDC | ~$0.00016 |

## Protocol fee

**0.002 USDC** flat per settled `check()`. Goes through the Registry, not directly to the publisher.

The fee economics:

```
Per check, 0.002 USDC debited from agent prepaid balance:
  match found    -> 80% to publisher (0.0016), 20% to treasury (0.0004)
  no match found -> 100% to treasury (0.002)
```

## Treasury

Accumulated from non-match checks (100% of the fee) and the treasury share of matched checks (20%).

Treasury balance is publicly readable:

```ts
const balance = await registry.treasuryBalance();
console.log(formatUsdc(balance));
```

The treasury pays for:

- **0G Compute charges**, every TEE inference paid in OG to the inference provider.
- **Indexer hosting**, Postgres + Fly machines + Moralis API key for token pricing.
- **Public feed delivery**, RSS / JSON / webhook infra.
- **Audit costs**, contract audits and key rotations.
- **Bounties and grants** for high-value antibody publications.

## Publisher rewards

A publisher who consistently mints accurate antibodies turns the 1 USDC stake into a perpetuity:

- 1 USDC stake locked 72h.
- Each match earns 0.0016 USDC (80% of the 0.002 fee).
- Stake unlocks for withdrawal after 72h, or on first match (whichever comes later in the implementation).

Break-even math: a publisher recovers the 1 USDC stake after **625 matches** (1 USDC / 0.0016 USDC per match). After that every match is pure profit.

The live demo has 14 publishers as of writing. Top publisher (`0x4789dd...bc28`) has 43 published antibodies, 386 successful blocks, and earns approximately $0.62 in cumulative rewards. Modest in absolute terms; meaningful in unit economics terms (the 14 publishers' combined stake is 14 USDC; their combined return on the stake exceeds the stake itself).

## What you pay total

Worst-case per agent action that triggers a novel-threat round-trip and an auto-publish:

| Component | Cost in USDC |
|---|---|
| Cache hit | $0 |
| Protocol fee (per settled check) | $0.002 |
| Settlement gas | ~$0.0001 |
| TEE compute (novel only) | +$0.00015 |
| Publish gas (auto-mint only) | ~$0.0005 |
| 1 USDC stake locked 72h (refundable) | refundable |
| **Total worst case** | **~$0.00285** |

Cache-hit checks (99% of agent traffic) cost the **$0.002 fee** plus settlement gas, total ~$0.0021.

## What you earn (publisher)

| Source | Per match | Cumulative |
|---|---|---|
| Match rewards (80% of the protocol fee) | $0.0016 | unbounded as long as antibody stays ACTIVE |
| Sweep bounty (releasing expired stakes) | ~$0.0001 | small, opportunistic |

Both rewards land in your prepaid USDC balance. Withdraw via `immunity.withdraw(amount)`.

## What gets slashed

A publisher's 1 USDC stake is slashed if a challenge against the antibody succeeds. Today challenges are governance-driven: a challenger files an on-chain claim, the protocol team adjudicates, the loser forfeits stake.

Slash destinations:
- v1: 100% to the treasury.
- v2: split between treasury and the successful challenger (planned 50/50).

## Why the model works

The economics are calibrated to make spam unprofitable and accuracy compounding:

- **Spam publish costs 1 USDC every time.** A spam publisher mints 1 USDC of stake, gets challenged, loses the stake. There is no path to recovery without earning matches.
- **Accuracy compounds.** A real, well-targeted antibody (Tornado Cash, a Lazarus wallet, a known drainer kit) gets matched dozens of times per day across the network. Cumulative match rewards exceed the stake within a week.
- **Treasury accumulates by default.** Every check (matched or not) pays into the treasury directly or via the 20% split. The treasury funds the network's off-chain costs (TEE compute, indexer infra) so the protocol does not need external grants to operate.

## Where to look

- Live treasury balance, [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai) for the Registry contract.
- Live publisher leaderboard, [immunity-protocol.com/publishers](https://immunity-protocol.com/publishers).
- Live block count and value-protected, [immunity-protocol.com/dashboard](https://immunity-protocol.com/dashboard).

## See also

- **[Settlement and tokenomics](/concepts/settlement-and-tokenomics/)**, the conceptual picture.
- **[Network: Registry on 0G](/network/registry-on-0g/)**, how to read these numbers yourself.
