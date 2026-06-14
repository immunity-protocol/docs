---
title: "Install"
order: 1
description: "Install the Immunity SDK in a Node 20+ project and fund a Base Sepolia wallet."
---

# Install the SDK

The Immunity SDK ships as `@immunity-protocol/sdk` on npm. It targets **Node 20 or newer** and depends on **ethers v6**.

## One command

```bash
npm install @immunity-protocol/sdk ethers
```

`ethers` is a peer dependency, so install it alongside the SDK. No Docker, no external daemon, no separate compute account: the SDK talks directly to the on-chain protocol on **Base** and to the Chainlink CRE jury through the chain.

## Confirm the install

```bash
node -e "import('@immunity-protocol/sdk').then(m => console.log(Object.keys(m)))"
```

You should see exports including `Immunity`, `BASE_SEPOLIA`, `parseUsdc`, plus the type and helper barrel.

## What you also need

The SDK is the integration surface, not the whole stack. To run a real agent against the live testnet you also need:

| Dependency | Purpose | How to get it |
|---|---|---|
| A **wallet** with Base Sepolia ETH | gas for on-chain calls (`check` settlement, `publish`, `register`) | a Base Sepolia faucet |
| A **prepaid USDC balance** in the Registry | settles the per-check fee and funds CRE verification | `deposit()` testnet USDC |
| A **registration bond** (publishers only) | one-time bonded ENS identity, the sybil cost | `registerPublisher(label)` |

Checkers (agents that only call `check()`) never need an identity. Only publishers register and post bonds.

## Pick a starting policy

The cheapest path is `novelThreatPolicy: "trust-cache"`, which never reaches the CRE jury: on a cache and registry miss it allows the action and flags `novel: true` for later review, with no on-chain call. Switch to the default `"verify"` once your wallet is funded and you want the CRE jury to classify novel threats in real time.

## Next

- **[Quickstart](/getting-started/quickstart/)**, the 30-line example that proves the install end-to-end.
- **[Concepts in two minutes](/getting-started/concepts-in-two-minutes/)**, the mental model before you go deeper.
- **[Skill for AI assistants](/getting-started/skill-for-ai-assistants/)**, drop the SKILL.md into your IDE so Claude / Cursor / Codex write idiomatic Immunity code on the first try.
