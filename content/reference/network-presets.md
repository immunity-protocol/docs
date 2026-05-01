---
title: "Network presets"
order: 6
description: "TESTNET constants and how to configure a custom NetworkConfig for mainnet or a private deployment."
---

# Network presets

The SDK ships one network preset (`TESTNET`) and accepts a custom `NetworkConfig` for everything else.

## `TESTNET`

```ts
import { TESTNET } from "@immunity-protocol/sdk";

console.log(TESTNET);
// {
//   name: "testnet",
//   chainId: 16602,
//   rpcUrl: "https://evmrpc-testnet.0g.ai",
//   registryAddress: "0xbbD14Ff50480085cA3071314ca0AA73768569679",
//   usdcAddress: "0x39D484EaBd1e6be837f9dbbb1DE540d425A70061",
//   blockExplorerUrl: "https://chainscan-galileo.0g.ai",
//   computeProvider: "0xa48f01287233509FD694a22Bf840225062E67836",
//   storageIndexerUrl: "https://indexer-storage-testnet-turbo.0g.ai",
// }
```

Use it directly:

```ts
import { Immunity, TESTNET } from "@immunity-protocol/sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider(TESTNET.rpcUrl);
const immunity = new Immunity({
  wallet: new Wallet(privateKey, provider),
  network: "testnet",   // or pass TESTNET directly
  axlUrl: "http://localhost:9002",
});
```

## `NetworkConfig`

For mainnet (when published) or a private deployment:

```ts
import { Immunity, type NetworkConfig } from "@immunity-protocol/sdk";

const myNetwork: NetworkConfig = {
  name: "my-private-deployment",
  chainId: 16601,
  rpcUrl: "https://rpc.example.internal",
  registryAddress: "0xYourRegistry...",
  usdcAddress: "0xYourMockUsdc...",
  blockExplorerUrl: "https://explorer.example.internal",
  computeProvider: "0xYourTeeProvider...",
  storageIndexerUrl: "https://storage-indexer.example.internal",
};

const immunity = new Immunity({
  wallet,
  network: myNetwork,
  axlUrl: "http://localhost:9002",
});
```

## Field reference

### `name`

Type: `string`. Display name. Surfaced in logs and error messages.

### `chainId`

Type: `number`. EVM chain id. Used for matcher hash construction (ADDRESS, CALL_PATTERN, GRAPH all hash with chainId).

### `rpcUrl`

Type: `string`. JSON-RPC endpoint. Must support EVM standard methods plus `eth_call`, `eth_getCode`, `eth_getLogs`. The SDK does **not** require `debug_*` or `trace_*` methods.

### `registryAddress`

Type: `Address`. The on-chain Registry contract. The SDK calls `check`, `publish`, `getAntibody` against this address.

### `usdcAddress`

Type: `Address`. The USDC (or MockUSDC on testnet) ERC20 contract. The SDK uses it for fee debits, deposits, and withdrawals.

### `blockExplorerUrl`

Type: `string`. Block explorer base URL. Used for log links in operator UIs (e.g., `${blockExplorerUrl}/tx/${checkId}`).

### `computeProvider`

Type: `Address`. The 0G Compute provider address registered in the on-chain inference services list. Used for TEE inference under `novelThreatPolicy: "verify"`.

Optional: omit if you use a custom `teeVerifier` that does not need 0G Compute.

### `storageIndexerUrl`

Type: `string`. The 0G Storage indexer endpoint. Used by `publish()` to upload evidence bundles and by `fetchPublicEnvelope(cid)` to retrieve them.

Optional: omit if your deployment does not use 0G Storage and your `teeVerifier` handles evidence differently.

## Switching networks

Pass the right config at construction. The SDK does not support hot-swapping networks on a live `Immunity` instance.

To switch networks at runtime: stop the current instance, construct a new one against the target network, start it.

```ts
await immunity.stop();

const next = new Immunity({
  wallet,
  network: { ...newNetworkConfig },
  axlUrl,
});
await next.start();
```

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, the wrapping config.
- **[Network: Registry on 0G](/network/registry-on-0g/)**, how to verify the Registry address yourself.
