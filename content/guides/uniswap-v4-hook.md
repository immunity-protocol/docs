---
title: "Uniswap v4 hook"
order: 6
description: "Install the Immunity hook on a Uniswap v4 pool. Every swap is checked against the on-chain mirror; flagged tokens revert at the beforeSwap stage, and protected blue-chips never do."
---

# Uniswap v4 hook

The Immunity hook is a Uniswap v4 `beforeSwap` hook that consults the on-chain **Mirror** for the input and output tokens of an inbound swap. If either token is hard-blocked, the swap reverts with a typed error and the LP is unaffected. Swappers need no SDK; the hook is the policy for the whole pool.

This is the **collective LP defense** path. You do not need every swapper to know about Immunity; the hook protects them automatically.

## How the hook works

```
swapper          PoolManager             ImmunityHook            Mirror
   │                  │                  (beforeSwap)              │
   │  swap(...)       │                      │                     │
   ├─────────────────>│  beforeSwap(key,     │                     │
   │                  │            params)   │                     │
   │                  ├─────────────────────>│  isHardBlocked(t)   │
   │                  │                      ├────────────────────>│
   │                  │                      │  bool               │
   │                  │                      │<────────────────────┤
   │                  │  revert ImmunityBlocked  or  proceed       │
   │  TX REVERTED     │<─────────────────────┤                     │
   │<─────────────────┤                      │                     │
```

The hook reads the Mirror cheaply (about one SLOAD per token). The pool reverts atomically; LP balances never move. The revert carries the offending token and `keccakId` so the swapper can look up why.

## What the hook checks

The hook reads the **enforcement decision** for the swap's tokens, not raw antibody data. ADDRESS is the antibody type relevant to a swap-path check; the Mirror reduces it to a single hard-block yes/no. The Mirror honors the **protected set**, so a swap against the canonical USDC, WETH, or router can never be reverted no matter how an antibody was published. See **[The mirror and on-chain consumers](/concepts/the-mirror-and-consumers/)**.

The hook also ships with `Pausable` and a never-block allowlist as safety rails.

## Installing the hook on your pool

You cannot retrofit a hook onto an existing v4 pool; hook attachment is part of pool initialization. Set `hooks` to the deployed `ImmunityHook` when you initialize the pool:

```solidity
PoolKey memory key = PoolKey({
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: IHooks(immunityHook)
});

poolManager.initialize(key, sqrtPriceX96);
```

The deployed `ImmunityHook` and `Mirror` addresses for Base Sepolia live in the `immunity-contracts-mirror` repo. To protect liquidity already in an unprotected pool, deploy a sibling pool with the hook attached, migrate liquidity, and deprecate the old pool.

## Errors a swapper sees

When the hook reverts, the swapper's wallet shows the typed error, `ImmunityBlocked(address token, bytes32 keccakId)`. Uniswap wraps hook reverts in a `CustomRevert.WrappedError` envelope; direct integrations walk that envelope to find the inner selector. The Immunity SDK frontends decode it automatically.

## Gas overhead

The hook adds roughly **30k gas** per swap: about one SLOAD per token consulted plus the hook call overhead. On a swap already costing 150-200k gas, that is a 15-20% overhead, worth it for any pool that has seen a single large drain.

## Verifying a flag reached the mirror

The Mirror is observation-only: it can only project a hard-block the Registry already enforces, and it respects the protected set. To confirm a token is hard-blocked on chain:

```ts
import { Contract, JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("https://sepolia.base.org");
const mirror = new Contract(MIRROR_ADDRESS, [
  "function isHardBlocked(address) view returns (bool)",
], provider);

console.log(await mirror.isHardBlocked(tokenAddress));
```

## See also

- **[The mirror and on-chain consumers](/concepts/the-mirror-and-consumers/)**, how the hook reads enforcement.
- **[Sybil resistance](/concepts/sybil-resistance/)**, the protected set the hook honors.
- The Uniswap v4 hook source in `immunity-contracts-mirror`.
