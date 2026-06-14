---
title: "The mirror and on-chain consumers"
order: 10
description: "On-chain consumers like a Uniswap v4 hook need a cheap, swap-path read of ADDRESS antibody enforcement. The Mirror provides it, and respects the protected set."
---

# The mirror and on-chain consumers

Most of Immunity is consumed off chain through the SDK. But some consumers live **inside a transaction**: a Uniswap v4 pool hook that must decide, mid-swap, whether a token is flagged. A hook cannot run the SDK, walk three tiers, or call the CRE jury in the swap path. It needs a single, cheap, deterministic on-chain read. That is what the **Mirror** provides.

## What the mirror carries

Only **ADDRESS** antibodies matter to an on-chain consumer. The other four types (CALL_PATTERN, BYTECODE, GRAPH, SEMANTIC) are richer matchers resolved at SDK level. ADDRESS enforcement, by contrast, can be reduced to a yes/no a contract can read in one call.

The Mirror exposes the **enforcement decision**, not raw antibody data: is this address hard-blocked right now, accounting for status, corroboration, and the protected set. A relayer keeps the Mirror in sync with the Registry by replaying its events. On Base the Registry is native, so the Mirror is a read-optimized projection beside it; the same pattern can replicate enforcement to other L2s for hooks deployed there.

## How a Uniswap v4 hook uses it

A v4 hook runs logic on every swap. The Immunity hook reads the Mirror for the swap's input and output tokens in `beforeSwap` and reverts the swap if either is hard-blocked. This is **collective LP protection**: the liquidity provider installs the hook once, and every swapper is protected automatically with no SDK in the loop.

```solidity
// inside beforeSwap, conceptually
if (mirror.isHardBlocked(tokenIn) || mirror.isHardBlocked(tokenOut)) {
    revert ImmunityBlocked();
}
```

See **[Guides: Uniswap v4 hook](/guides/uniswap-v4-hook/)** for installation and a runnable example.

## The protected set still applies

The Mirror honors the **protected set**. A blue-chip address (USDC, WETH, a canonical router) can never be hard-blocked, so the hook will never revert a swap against the canonical router no matter how an antibody was published. The hook also ships with `Pausable` and a never-block allowlist as belt-and-suspenders safety rails. See **[Sybil resistance](/concepts/sybil-resistance/)**.

## Trust model

The Mirror is **observation-only**. It cannot mint antibodies; it only projects enforcement decisions already true on the Registry. The risk surface is delayed propagation, not false propagation:

- a relayer outage means a new flag is late to the Mirror, never that a fake flag appears,
- the Mirror cannot hard-block anything the Registry does not, and it cannot override the protected set.

A consumer that wants ground truth can always cross-check the Mirror against the Registry directly.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, where the hard-block decision comes from.
- **[Guides: Uniswap v4 hook](/guides/uniswap-v4-hook/)**, the canonical mirror consumer.
- **[Sybil resistance](/concepts/sybil-resistance/)**, the protected set the hook honors.
