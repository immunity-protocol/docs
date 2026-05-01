---
title: "Install"
order: 1
description: "Install the Immunity SDK in a Node 20+ project. The peer-dep flag is required."
---

# Install the SDK

The Immunity SDK ships as `@immunity-protocol/sdk` on npm. It targets **Node 20 or newer** and depends on **ethers v6**.

## One command

```bash
npm install --legacy-peer-deps @immunity-protocol/sdk ethers
```

The `--legacy-peer-deps` flag is **required**. The 0G Storage SDK that powers evidence uploads pins ethers exactly, so npm refuses the install without the flag.

## Confirm the install

```bash
node -e "import('@immunity-protocol/sdk').then(m => console.log(Object.keys(m)))"
```

You should see exports including `Immunity`, `TESTNET`, `parseUsdc`, plus the type and helper barrel.

## What you also need

The SDK is the integration surface, not the whole stack. To run a real agent against testnet you also need:

| Dependency | Purpose | Where it runs |
|---|---|---|
| A **wallet** with testnet OG | gas for `Registry.check()` | your machine, env-loaded |
| A **prepaid USDC balance** in the Registry | settles the per-check protocol fee | on chain, topped via `deposit()` |
| An **AXL daemon** | gossip propagation | local Docker, see infra/axl-mesh |
| A **0G Compute account** (verify policy only) | TEE inference for novel threats | external, paid in OG |

The cheapest path is to start with `novelThreatPolicy: "trust-cache"`, which skips the TEE entirely and avoids the 0G Compute account requirement. Switch to `"verify"` once you have funded compute and want real novel-threat detection.

## Next

- **[Quickstart](/getting-started/quickstart/)**, the 30-line example that proves the install end-to-end.
- **[Concepts in two minutes](/getting-started/concepts-in-two-minutes/)**, the mental model before you go deeper.
- **[Skill for AI assistants](/getting-started/skill-for-ai-assistants/)**, drop the SKILL.md into your IDE so Claude / Cursor / Codex write idiomatic Immunity code on the first try.
