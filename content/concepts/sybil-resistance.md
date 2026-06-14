---
title: "Sybil resistance"
order: 6
description: "The worst attack on a threat network is a cheap actor flagging a genuine address. Here is exactly how Immunity makes that attacker always lose."
---

# Sybil resistance

A threat-sharing network has one catastrophic failure mode: a cheap actor flags a **genuine** address (say, a canonical router), every agent blocks real activity, and the attacker even earns a cut of the resulting fees. If the stake is refundable, griefing is free and profitable, and the damage is a network-wide, uncorrectable denial of service.

Immunity is built so that attacker always loses. This page is the whole defense in one place.

## The defenses, layered

### 1. Bonded identity is the sybil cost

Publishing requires a registered identity: a bonded `*.immunity.eth` subname minted through ENS Durin. Registration locks a **non-refundable-on-misbehavior bond**. Minting a name on an L2 is cheap; the bond is what makes spinning up a thousand publisher identities expensive. Checkers (agents that only call `check()`) need no identity, so the friction lands only on the side that can do harm. See **[Reputation and identity](/concepts/reputation-and-identity/)**.

### 2. Bonds are non-refundable and scale with the claim

A publish locks a bond that stays at risk the entire time the antibody is enforced. The bond is `base x severityFactor x prominenceFactor`:

- claiming higher **severity** costs more,
- flagging a higher-**prominence** target (a blue-chip, or any young, low-volume frontier address) costs more.

So flagging the Uniswap router, or a brand-new protocol, is deliberately expensive. A false flag forfeits the bond.

### 3. No single identity can hard-block

Hard-block requires `corroboration >= K`: K **independent reputable publishers** flagging the same matcher. One compromised genesis key, or one rogue high-reputation publisher, cannot hard-block alone, it can only raise an advisory. This is the strongest single fix, because it removes the single point of failure entirely. See **[Two-speed enforcement](/concepts/two-speed-enforcement/)**.

### 4. The protected set is a hard floor

A small, timelocked-multisig-curated list of blue-chips (USDC, WETH, canonical routers, major Base protocols) **cannot be hard-blocked** no matter how corroborated a flag is, capped at advisory. Flagging a protected address requires a large bond and auto-opens a challenge. A parallel high bond applies to flagging any young or low-volume address, so the frontier gets a protection floor too.

### 5. Reputation gates enforcement strength

On-chain reputation is earned-only, impact-weighted, and slow to convert into hard-block authority, so cheap reputation-grinding does not buy censorship power. A fresh identity has zero enforcement weight: advisory-only until it earns trust. Reputation is written **only** by the protocol's Registry and challenge logic, never by publishers. See **[Reputation and identity](/concepts/reputation-and-identity/)**.

### 6. Fees escrow, then claw back

A probation antibody's publisher fee share is **escrowed**, not paid. It releases only on maturation and is **clawed back on slash**. A false antibody therefore earns exactly zero, even if it matched checks before being killed.

### 7. The challenge game makes false flags a target

Anyone (the flagged victim, the address owner, or a bounty-hunter agent) can `challenge` an antibody. An invalid antibody is slashed: bond and escrowed fees go to the challenger, reputation drops, and the matcher slot is freed so a correction can be published. Hunters profit by cleaning the network, which makes publishing a false antibody self-defeating. See **[The challenge game and jury](/concepts/challenge-game-and-jury/)**.

## The attacker's ledger

Run the worst attack through the machine: a low-reputation actor flags a genuine, prominent address.

1. They must register (bond at risk) and post a large bond scaled by the target's prominence.
2. The flag is **advisory-only** (lone, low-reputation) and, if the target is protected, can never be more than advisory. No mass block, no censorship.
3. Their publisher fee share is escrowed, not paid.
4. A hunter challenges. The CRE jury rules the flag invalid.
5. The attacker's bond and escrowed fees go to the hunter; their reputation is slashed.

Net: the attacker spends a bond, censors nobody, earns nothing, loses the bond plus reputation, and funds the hunter who cleaned it up. There is no configuration in which griefing pays.

## Honest limits

Immunity is hardened, not magic. The residual assumptions:

- **Permissionless re-grind.** A slashed actor can register a fresh identity. The deterrent is bond cost plus the time to re-earn reputation, not permanent exclusion, which is inherent to open registration.
- **Genesis grant.** Bootstrapping uses a small, disclosed, multisig/timelocked set of genesis publishers and an audited seed corpus. It is a sunsetting trust assumption; corroboration-gated hard-block neuters a single compromised genesis key.
- **Cold-start.** Because hard-block needs independent corroboration, the network is advisory-only until an independent publisher set grows. Launch relies on disclosed genesis-publisher corroboration and decentralizes from there.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, the advisory-vs-hard-block split this depends on.
- **[Reputation and identity](/concepts/reputation-and-identity/)**, the bonded ENS identity and on-chain reputation.
- **[The challenge game and jury](/concepts/challenge-game-and-jury/)**, how false flags get killed.
