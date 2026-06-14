---
title: "Network presets"
order: 6
description: "BASE_SEPOLIA and BASE_MAINNET presets, the NetworkConfig shape, and resolveNetwork."
---

# Network presets

The SDK ships two presets and accepts a custom `NetworkConfig` for self-hosted deployments. Reference them by string (`"base-sepolia"`, `"base-mainnet"`) in `ImmunityConfig.network`, or import the objects directly.

## `BASE_SEPOLIA`

The live Immunity network.

```ts
import { BASE_SEPOLIA } from "@immunity-protocol/sdk";

// {
//   name: "base-sepolia",
//   chainId: 84532,
//   rpcUrl: "https://sepolia.base.org",
//   blockExplorerUrl: "https://sepolia.basescan.org",
//   lighthouseGateway: "https://gateway.lighthouse.storage/ipfs/",
//   storageGatewayUrl: "https://immunity-gateway.fly.dev",
//   creOraclePublicKey: "0x0286bb5ddb6912da9d9c7c0d3df9664ac3d6440c1ab0929ae02423d1ce60fe35e5",
//   addresses: {
//     registry:          "0x15F177B17884B991703300C2dcCBA790Dda33fbC",
//     reputation:        "0x436510F3382F67bDF1eE4B6c4b6f940Eb492b3c4",
//     registrar:         "0x55237bE657245A6bf223D4b721A72b8e1D2E8523",
//     protectedSet:      "0x8b20aE052F9391e7b071A262aDa201F2189A1901",
//     challengeManager:  "0xc05ffEA7657d9F2c8879342cDAa2bE0eF238F04d",
//     creReceiver:       "0xc4f843aac2C94ce2D349C166d1D8D58cb7049C66",
//     novelVerification: "0x0f3733f4683029771E7730288339B460Eb377435",
//     usdc:              "0xe697EF7724453F239D8c0EB9295D87C344D9CE60",
//     l2registry:        "0xc647c0693ca93D2Ee5681C2eE7AF02d18C76F3B5",
//   },
// }
```

```ts
import { Immunity } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider(BASE_SEPOLIA.rpcUrl);
const immunity = new Immunity({
  wallet: new Wallet(privateKey, provider),
  network: "base-sepolia",   // or pass BASE_SEPOLIA directly
});
```

## `BASE_MAINNET`

A placeholder until the audited mainnet deploy. Its addresses are all zero and its CRE oracle key is a placeholder, so do not point production at it yet.

## `NetworkConfig`

For a self-hosted deployment, pass a full object.

```ts
import { Immunity, type NetworkConfig } from "@immunity-protocol/sdk";

const myNetwork: NetworkConfig = {
  name: "my-deployment",
  chainId: 84532,
  rpcUrl: "https://rpc.example.internal",
  blockExplorerUrl: "https://explorer.example.internal",
  lighthouseGateway: "https://gateway.lighthouse.storage/ipfs/",
  storageGatewayUrl: "https://my-gateway.example.internal",
  creOraclePublicKey: "0x02...",
  addresses: {
    registry: "0x...", reputation: "0x...", registrar: "0x...",
    protectedSet: "0x...", challengeManager: "0x...", creReceiver: "0x...",
    novelVerification: "0x...", usdc: "0x...", l2registry: "0x...",
  },
};

const immunity = new Immunity({ wallet, network: myNetwork });
```

## Field reference

| Field | Type | Purpose |
|---|---|---|
| `name` | `string` | display name, surfaced in logs |
| `chainId` | `number` | EVM chain id; used in matcher hash construction |
| `rpcUrl` | `string` | JSON-RPC endpoint (standard `eth_call`/`eth_getCode`/`eth_getLogs`) |
| `blockExplorerUrl` | `string` | explorer base, for log links (Basescan) |
| `lighthouseGateway` | `string` | keyless IPFS READ base (with trailing `/ipfs/`) |
| `storageGatewayUrl` | `string` | signed-POST WRITE target; the gateway holds the Lighthouse key and pins |
| `creOraclePublicKey` | `Hex` | compressed secp256k1 pubkey of the CRE oracle; evidence context is ECIES-encrypted to it |
| `addresses` | `CoreAddresses` | the deployed core contract addresses |

`CoreAddresses` carries `registry`, `reputation`, `registrar`, `protectedSet`, `challengeManager`, `creReceiver`, `novelVerification`, `usdc`, and `l2registry`.

## `resolveNetwork(input)`

Resolves a preset name or config object to a concrete `NetworkConfig`. `undefined` and `"base-sepolia"` return `BASE_SEPOLIA`; `"base-mainnet"` returns `BASE_MAINNET`; `"custom"` throws (pass a `NetworkConfig` object instead); a `NetworkConfig` is returned as-is.

## Switching networks

Construction picks the network; there is no hot-swap. Stop the instance, construct a new one against the target network, start it.

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, the wrapping config.
- **[Network: Registry on Base](/network/registry-on-base/)**, how to verify these addresses yourself.
