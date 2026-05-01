---
title: "Uniswap v4 hook"
order: 4
description: "Install the Immunity hook on a Uniswap v4 pool. Every swap on the pool is checked against the cross-chain mirror; flagged tokens revert at the BeforeSwap stage."
---

# Uniswap v4 hook

The Immunity hook is a Uniswap v4 BeforeSwap hook that consults the on-chain mirror for the input/output tokens of an inbound swap. If either token is flagged, the swap reverts with a friendly typed error and the LP is unaffected. No SDK install needed for the swappers; the hook protects the pool itself.

This is the **collective LP defense** path. You do not need every swapper on your pool to know about Immunity; the hook is the policy.

## How the hook works

```
swapper sends swap            Uniswap v4 PoolManager           Immunity hook              Mirror
                                                                 (BeforeSwap)
       │                              │                              │                     │
       │  swap(...)                   │                              │                     │
       ├─────────────────────────────>│                              │                     │
       │                              │  beforeSwap(poolKey,         │                     │
       │                              │             swapParams)      │                     │
       │                              ├─────────────────────────────>│                     │
       │                              │                              │  isMirrored(token)  │
       │                              │                              ├────────────────────>│
       │                              │                              │  bool               │
       │                              │                              │<────────────────────┤
       │                              │                              │                     │
       │                              │  revert TokenBlocked or      │                     │
       │                              │  return BeforeSwapDelta()    │                     │
       │                              │<─────────────────────────────┤                     │
       │  TX REVERTED                 │                              │                     │
       │<─────────────────────────────┤                              │                     │
```

Hook contract reads the `MirrorRegistry` cheap (one SLOAD per token). The pool reverts atomically; LP balances do not move. The error message includes the antibody's `keccakId` so the swapper can look up why.

## Installing the hook on your pool

Two paths.

### A) Deploy a new pool with the hook attached

When initializing a v4 pool, set `hooks` to the deployed `ImmunityHook` contract. The pool will route every `BeforeSwap` through the hook automatically.

```solidity
// In your deployment script.
PoolKey memory key = PoolKey({
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: IHooks(immunityHook)
});

poolManager.initialize(key, sqrtPriceX96, ZERO_BYTES);
```

The hook addresses for live deployments:

| Network | ImmunityHook | MirrorRegistry |
|---|---|---|
| Sepolia (demo) | `0xd3335f3d69e97c314350eda63fb5ba0163dd0080` | `0x...` (see SDK constants) |
| Ethereum mainnet | Roadmap | Roadmap |
| Base | Roadmap | Roadmap |

### B) Existing pool, no hook

You cannot retrofit a hook onto an already-deployed v4 pool. Hook attachment is part of pool initialization. To migrate an existing pool, you deploy a sibling pool with the hook attached, migrate liquidity, and deprecate the unprotected pool.

The Immunity demo at [immunity-protocol.com/dex](https://immunity-protocol.com/dex) shows two side-by-side pools: protected (with hook) and unprotected (without). Try the same swap against both and you can see the hook intervene live.

## What the hook checks

Today the hook consults the **MirrorRegistry** for ADDRESS antibodies whose `target` matches either swap token. ADDRESS is the only antibody type that mirrors cross-chain (see [Cross-chain mirror](/concepts/cross-chain-mirror/) for why).

Future hook features (roadmap):
- Sender-address checks (block swaps from sanctioned wallets).
- Tx-origin checks (block swaps from drainer-controlled bots).
- Calldata-pattern checks (block swaps targeting honeypot tokens via specific approve patterns).

For now, address-of-token is the only check.

## Errors a swapper sees

When the hook reverts, the swapper's wallet shows the error name and arguments. The Immunity hook emits:

- **`TokenBlocked(address token, bytes32 keccakId)`**, the swap input or output token is on the registry.
- **`SenderBlocked(address sender, bytes32 keccakId)`**, future. Sender address is on the registry.
- **`OriginBlocked(address origin, bytes32 keccakId)`**, future. Tx origin is on the registry.

The friendly Immunity SDK frontends decode these errors automatically. Direct integrations should walk Uniswap's `CustomRevert.WrappedError` envelope to find the inner selector. See the SDK source `dex.js` for a reference implementation of the unwrap.

## Gas overhead

The hook adds approximately **30k gas** per swap. One SLOAD per token consulted (~2 SLOADs for a swap), plus the hook contract call overhead. On a chain where the swap is already 150-200k gas, this is a 15-20% overhead.

Worth the cost for any pool that's seen a single $100k drain. Decide based on your LP's risk tolerance.

## Verifying flagged tokens hit the mirror

The mirror is observation-only and the relayer is permissionless. To verify an ADDRESS antibody on 0G has propagated to Sepolia:

```ts
import { Contract, JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
const mirror = new Contract(MIRROR_ADDRESS, [
  "function isMirrored(bytes32) view returns (bool)",
], provider);

const isLive = await mirror.isMirrored(antibody.keccakId);
console.log(`${antibody.immId} is mirrored on Sepolia: ${isLive}`);
```

Latency between 0G publish and Sepolia mirror is typically under one Sepolia block.

## See also

- **[Cross-chain mirror](/concepts/cross-chain-mirror/)**, how the source-of-truth gets to the target chain.
- The live demo: [immunity-protocol.com/dex](https://immunity-protocol.com/dex).
- The Uniswap v4 hook source in `immunity-contracts-mirror`.
