---
title: "Helpers"
order: 7
description: "Hash, USDC, address, and storage helpers re-exported from the SDK. Useful for tooling and mirror-contract integrations."
---

# Helpers

The SDK re-exports a small set of utility functions that match the on-chain canonicalization byte-for-byte. Use them when you need to compute matcher hashes off chain (e.g., for a relayer, a mirror contract, or a testing harness).

## Hash helpers

All match the on-chain Solidity computation exactly. Verified by the SDK's integration test `keccak-parity.test.ts`.

### `computeKeccakId(abType, flavor, primaryMatcherHash, publisher)`

Reproduces the contract's `keccakId` derivation:

```
keccakId = keccak256(abi.encode(abType, flavor, primaryMatcherHash, publisher))
```

```ts
import { computeKeccakId, hashAddressMatcher } from "@immunity-protocol/sdk";

const matcherHash = hashAddressMatcher(16602, "0xCAFE...");
const id = computeKeccakId("ADDRESS", 0, matcherHash, publisherAddr);
```

Useful for predicting an antibody's id before publishing (to dedupe locally) or for a relayer that needs to verify a mirrored antibody's id matches the source-chain id.

### `hashAddressMatcher(chainId, target)`

```
keccak256(abi.encode(chainId, target))
```

### `hashCallPatternMatcher(chainId, target, selector, argsTemplate)`

```
keccak256(abi.encode(chainId, target, selector, keccak256(argsTemplateBytes)))
```

`argsTemplate` is the partial args object; the helper canonicalizes it to bytes before hashing.

### `hashBytecodeMatcher(runtimeBytecode)`

```
keccak256(runtimeBytecode)
```

The runtime bytecode (not the deployment bytecode). Fetch via `eth_getCode(address, "latest")`.

### `hashGraphMatcher(chainId, taintedAddresses)`

```
keccak256(abi.encode(chainId, sortedAddresses))
```

Addresses are sorted ASCII-lowercase before hashing. Order does not matter at the input layer.

### `hashSemanticMatcher(flavor, marker)`

```
keccak256(abi.encode(flavor, lowercase(marker)))
```

Markers are lowercased and trimmed before hashing.

### `computeTaintSetId(addresses)`

For the GRAPH auxiliary event indexer:

```
keccak256(abi.encode(sortedAddresses))
```

A type alias for the chain-agnostic taint identifier.

## USDC helpers

### `parseUsdc(amount)`

String to base units. Always returns `bigint`.

```ts
parseUsdc("1.5")      // 1_500_000n
parseUsdc("0.0001")   // 100n
parseUsdc("0.00001")  // throws RangeError (below the 6-decimal precision)
```

### `formatUsdc(amount)`

Base units to human-readable string. Always 6 decimals.

```ts
formatUsdc(1_500_000n)   // "1.500000"
formatUsdc(100n)         // "0.000100"
```

### `USDC_DECIMALS`

```ts
import { USDC_DECIMALS } from "@immunity-protocol/sdk";
console.log(USDC_DECIMALS);  // 6
```

## Address helpers

### `normalizeAddress(addr)`

Lowercases, validates length (40 hex chars), validates 0x prefix. Returns the normalized address or throws.

```ts
normalizeAddress("0xCAFE...000")   // "0xcafe...000"
normalizeAddress("CAFE...000")      // throws (no 0x)
normalizeAddress("0xCAFE...0001")   // throws (41 chars)
```

### `isAddress(value)`

Predicate. Returns `true` for any valid 0x-prefixed 20-byte hex.

```ts
isAddress("0xCAFE...000")  // true
isAddress("0xCAFE...0001") // false
isAddress(null)             // false
```

### `chainAddressKey(chainId, address)`

Stable join key for `(chainId, address)` pairs. Used internally by the cache for ADDRESS lookups.

```ts
chainAddressKey(16602, "0xCAFE...000")  // "16602:0xcafe...000"
```

## Storage helpers

### `createStorageClient(indexerUrl)`

Returns a `StorageClient` that talks to a 0G Storage indexer.

```ts
const storage = createStorageClient("https://indexer-storage-testnet-turbo.0g.ai");
```

### `uploadPublicEnvelope(client, payload)`

Uploads a JSON payload as a public (unencrypted) envelope. Returns the `cid` (a 0G Storage hash).

```ts
const cid = await uploadPublicEnvelope(storage, { reason: "...", chainTx: "0x..." });
```

### `fetchPublicEnvelope(client, cid)`

Reads a public envelope back. Returns the parsed JSON payload.

```ts
const payload = await fetchPublicEnvelope(storage, cid);
```

### `uploadEncryptedContext(client, payload, recipientPubkey)`

Uploads a JSON payload encrypted to a recipient's public key (e.g., the TEE's pubkey). Used internally by the TEE flow; rare in user code.

## Tx fact extraction

### `extractFacts(tx)`

Parses a `ProposedTx` and returns a `TxFacts` struct. Used internally by `check()` to populate `result.txFacts`. Exposed for tooling that needs the same parse without going through the full SDK:

```ts
import { extractFacts } from "@immunity-protocol/sdk";

const facts = extractFacts({ to: "0x...", data: "0xa9059cbb...", chainId: 1 });
// { tokenAddress: "0x...", tokenAmount: 1000n, originChainId: 1n }
```

Returns all-zero facts when the calldata cannot be decoded as a known transfer or swap pattern.

## TEE prompt builders

Lower-level than most users need. Expose the prompt-building primitives so tooling can replicate the TEE input format without going through `Immunity`:

- `buildVerdictPrompt(tx, ctx)`, returns the structured prompt the SDK posts to the TEE.
- `distillBundle(tx, ctx)`, distills the input into the compact JSON form the TEE expects.
- `parseVerdict(rawJson)`, parses a TEE response and validates the schema.

Use only if you are building an alternative `teeVerifier` or a testing harness.

## See also

- **[Immunity class](/reference/immunity-class/)**, the high-level API that uses these helpers internally.
- **[Antibody](/reference/antibody/)**, the on-chain shape these helpers compute hashes for.
