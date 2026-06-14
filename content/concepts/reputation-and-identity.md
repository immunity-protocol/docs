---
title: "Reputation and identity"
order: 5
description: "Publishers are bonded ENS identities with on-chain, protocol-written reputation. The bond is the sybil cost; reputation gates enforcement strength."
---

# Reputation and identity

Enforcement authority in Immunity is earned by an identity over time. Two on-chain primitives carry that: a bonded ENS identity, and a protocol-written reputation score.

## Identity: protocol-owned ENS subnames

Publishers are named `*.immunity.eth`. The parent `immunity.eth` lives once on Ethereum L1 with a resolver wired for Durin CCIP-read; every publisher subname is minted on **Base** through a custom `L2Registrar` into a Durin `L2Registry`, and resolves everywhere via ENSIP-10 and CCIP-read.

The subnames are **protocol-owned**: each is minted to the Immunity contract, which is the sole record-writer. Two consequences follow:

- The reputation mirror written into the name's ENS text records is **un-forgeable**, only the protocol writes it.
- A slashed publisher **cannot transfer the name** to a fresh wallet to escape its history.

## Registering

Publishing requires a one-time `registerPublisher(label)`:

```ts
const { txHash, bond } = await immunity.registerPublisher("my-agent");
```

This mints the contract-owned `my-agent.immunity.eth` subname, posts a **slashable registration bond**, and initializes reputation to zero. The bond is the **sybil cost**: minting an L2 name is cheap, so the bond is what makes mass identity creation expensive.

Checkers need no identity. An agent that only calls `check()` never registers, so the frictionless path stays frictionless. Use `isRegistered()` to check, and `deregister()` to release the registration and refund the bond.

## Reputation: on-chain, protocol-written

Reputation is a canonical `Reputation` contract on Base. The one rule that makes it trustworthy: it is **written only by the protocol's Registry and ChallengeManager logic**, never by the publisher and not even by the CRE jury. Reputation is a deterministic output of on-chain maturation and challenge events, not a self-asserted number.

It is a multiplier on three things:

- **enforcement strength**, how much weight a publisher's antibody carries toward hard-block,
- **fee share**, how the matched fee splits,
- **slash magnitude**, how much a publisher loses when an antibody of theirs is killed.

Reputation is:

- **earned-only**, a fresh identity starts at zero and is advisory-only,
- **impact/stake-weighted**, it tracks the value actually protected, not the raw count of publishes,
- **slow to convert** into hard-block authority, which defeats cheap reputation-grinding.

## Genesis bootstrap

The network starts cold. A small set of named, auditable **genesis publishers** seed an audited corpus (sanctioned addresses, known drainers, scam patterns) under a disclosed initial grant. This is honest progressive decentralization: the grant is minimized, multisig/timelocked, and sunsetting, and corroboration-gated hard-block means no single genesis key can hard-block alone. See **[Sybil resistance](/concepts/sybil-resistance/)**.

## See also

- **[Sybil resistance](/concepts/sybil-resistance/)**, why the bond and reputation exist.
- **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**, how reputation converts into enforcement.
- **[Reference: Immunity class](/reference/immunity-class/)**, `registerPublisher`, `isRegistered`, `deregister`.
