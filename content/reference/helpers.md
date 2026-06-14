---
title: "Helpers"
order: 7
description: "USDC, address, enforcement, storage, and crypto helpers re-exported from the SDK for tooling and integrations."
---

# Helpers

The SDK re-exports a set of utilities that match the on-chain canonicalization and the read-side enforcement logic. Use them in relayers, indexers, tests, and custom verifiers. The matcher-hash helpers and seed shapes have their own page: see [Matchers and seeds](/reference/matchers/).

## Identity

### `computeKeccakId(abType, flavor, primaryMatcherHash, publisher)`

Reproduces the contract's id derivation, `keccak256(abi.encode(abType, flavor, primaryMatcherHash, publisher))`. Useful to predict an antibody's id before publishing.

### `formatImmId(year, immSeq)`

Formats `IMM-YYYY-NNNN` from a year and sequence number.

## Enforcement

### `classifyEnforcement(inputs, k, nowSec)`

Returns the read-side enforcement tier for an antibody: `"hard-block"`, `"advisory"`, or `"none"`. `k` is the corroboration threshold (from the Registry), `nowSec` is the current unix time as a `bigint`. This is the function behind the two-speed decision.

- `"none"`, the antibody is SLASHED, EXPIRED, or past its TTL.
- `"hard-block"`, `(corroboration >= k or isSeeded)` and the target is not protected.
- `"advisory"`, eligible but `corroboration < k`, or the target is protected.

### `EnforcementResolver`

Combines Tier-1 matchers and the Tier-2 RPC lookup into a single enforcement resolution for a proposed tx and context. The `Immunity` facade builds one internally; instantiate it directly only for custom pipelines.

### `isLiveAntibody(ab, nowSec)`

`true` if the antibody can surface from a lookup at all (not SLASHED, not EXPIRED, not past TTL). Says nothing about advisory vs hard-block, that is `classifyEnforcement`.

### `decodeAntibody(raw)` / `decodeEnforcementInputs(raw)`

Decode a raw on-chain struct into an `Antibody`, or into the inputs `classifyEnforcement` consumes. Use with `contracts.registry` to read antibodies directly.

## USDC math (6 decimals)

```ts
import { parseUsdc, formatUsdc, USDC_DECIMALS } from "@immunity-protocol/sdk";

parseUsdc("1")          // 1_000_000n
parseUsdc("0.002")      // 2_000n
parseUsdc("0.0000001")  // throws (more than 6 decimals)

formatUsdc(1_000_000n)  // "1"
formatUsdc(2_000n)      // "0.002"

USDC_DECIMALS           // 6
```

## Address helpers

```ts
import { normalizeAddress, isAddress, chainAddressKey } from "@immunity-protocol/sdk";

normalizeAddress("0xABC...")        // lowercased, validated; throws on bad input
isAddress("0xABC...")               // boolean predicate
chainAddressKey(84532, "0xABC...")  // "84532:0xabc..." scope key
```

## Transaction facts

### `extractFacts(tx)`

Parses a `ProposedTx` into `TxFacts` `{ tokenAddress, tokenAmount, originChainId }`. Detects ERC20 transfers, common swaps, and native transfers. Returns all-zero for unrecognized calldata (normal, not an error). Used internally by `check()`; exposed for tooling.

## Storage (Lighthouse / IPFS)

### `StorageClient`

Signs and POSTs evidence to the protocol storage gateway (which holds the Lighthouse key and pins to IPFS), and reads public envelopes back from the keyless IPFS gateway.

```ts
import { StorageClient } from "@immunity-protocol/sdk";

const storage = new StorageClient({
  storageGatewayUrl: network.storageGatewayUrl,
  lighthouseGateway: network.lighthouseGateway,
  signer,
});
```

### `uploadPublicEnvelope` / `fetchPublicEnvelope`

Upload a `PublicEnvelopeV1` and read it back. `cidToHex32` / `hex32ToCid` convert between the CID string form and the 32-byte on-chain digest. `canonicalJson` produces the deterministic serialization the gateway signs over.

## Encryption (ECIES)

```ts
import { encryptContext, decryptContext, getPublicKeyFromPrivate } from "@immunity-protocol/sdk";

const bundle = await encryptContext("sensitive notes", network.creOraclePublicKey);
// only the CRE oracle's private key can decryptContext(bundle, key)
```

Context is ECIES-encrypted to the CRE oracle so only the DON's confidential compute can read it. `getPublicKeyFromPrivate` derives the compressed pubkey from a private key.

## Reputation and lookup (advanced)

- `ReputationClient`, read publisher reputation (`PublisherReputation`).
- `Tier2Lookup`, the on-chain matcher lookup used by Tier 2.
- `NegativeMatcherCache`, the TTL negative cache.

## CRE verifier (advanced)

- `CreNovelVerifier`, the Tier-3 CRE verifier; `verdictCommitment`, its attestation commitment.
- `buildVerdictPrompt`, `distillBundle`, `parseVerdict`, the prompt/parse primitives, for building a custom `NovelVerifier`.

## See also

- **[Matchers and seeds](/reference/matchers/)**, the per-type matcher-hash helpers.
- **[Immunity class](/reference/immunity-class/)**, the high-level API that uses these internally.
