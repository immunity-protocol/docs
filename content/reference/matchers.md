---
title: "Matchers and seeds"
order: 8
description: "The five antibody seed shapes and the matcher-hash helpers that derive each primaryMatcherHash, matching the on-chain canonicalization byte-for-byte."
---

# Matchers and seeds

Every antibody declares what it matches through a typed `AntibodySeed`. The SDK derives each antibody's `primaryMatcherHash` from the seed with a per-type helper, and the helpers reproduce the on-chain Solidity canonicalization exactly, so an id computed off chain equals the one the contract stores.

## The five seed shapes

```ts
type AntibodySeed =
  | { abType: "ADDRESS"; chainId: number; target: Address }
  | { abType: "CALL_PATTERN"; chainId: number; target: Address;
      selector: `0x${string}`; argsTemplate: `0x${string}` }
  | { abType: "BYTECODE"; bytecodeHash: Hex32 }
  | { abType: "GRAPH"; chainId: number; taintedAddresses: Address[]; taintSetId: Hex32 }
  | { abType: "SEMANTIC"; flavor: SemanticFlavor;
      pattern: { kind: "hash"; value: Hex32 } | { kind: "marker"; value: string } };
```

`SemanticFlavor` is `"COUNTERPARTY" | "MANIPULATION" | "PROMPT_INJECTION"`.

A seed is what you pass to `publish({ seed, ... })`. It is also what travels on the antibody's evidence envelope so subscribers can rebuild their lookup indices without re-reading the chain.

## Matcher-hash helpers

Each helper takes a typed input object and returns the `primaryMatcherHash`. Addresses are lowercase-normalized before encoding.

### `hashAddressMatcher({ chainId, target })`

```
keccak256(abi.encode(uint256 chainId, address target))
```

### `hashCallPatternMatcher({ chainId, target, selector, argsTemplate? })`

```
keccak256(abi.encode(uint256 chainId, address target, bytes4 selector, bytes32 keccak256(argsTemplate)))
```

`selector` is the 4-byte function selector. `argsTemplate` is the canonical argument template encoded as raw calldata after the selector; it may be `0x` (empty) for selector-only patterns.

### `hashBytecodeMatcher({ bytecodeHash })`

```
keccak256(abi.encode(bytes32 bytecodeHash))
```

`bytecodeHash` is the keccak256 of the deployed runtime bytecode (the `EXTCODEHASH`). Because no chainId is mixed in, identical contracts on any chain match one antibody, which catches re-deployed clones.

### `hashGraphMatcher({ chainId, taintedAddresses })`

```
taintSetId         = keccak256(abi.encode(uint256 chainId, address[] sorted))
primaryMatcherHash = keccak256(abi.encode(bytes32 taintSetId))
```

`taintedAddresses` is order-independent: the SDK sorts ascending-lowercase before hashing, so equivalent sets produce equivalent ids. At least one address is required.

### `hashSemanticMatcher({ flavor, pattern })`

```
patternHash        = pattern.kind == "hash" ? pattern.value : keccak256(utf8(pattern.value))
primaryMatcherHash = keccak256(abi.encode(uint8 flavor, bytes32 patternHash))
```

Supply either a precomputed 32-byte fingerprint (`kind: "hash"`) or a marker string (`kind: "marker"`) that the SDK hashes for you.

### `computeTaintSetId({ chainId, taintedAddresses })`

Returns just the `taintSetId` (the inner hash) for GRAPH antibodies, useful for the auxiliary taint indexer.

## Putting it together

```ts
import { computeKeccakId, hashAddressMatcher } from "@immunity-protocol/sdk";

const matcherHash = hashAddressMatcher({ chainId: 84532, target: "0xCAFE..." });
const keccakId = computeKeccakId("ADDRESS", 0, matcherHash, publisherAddress);
// predict an antibody's id before publishing, to dedupe locally
```

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the five types in context.
- **[Helpers](/reference/helpers/)**, `computeKeccakId` and the rest of the utility surface.
- **[Publish an antibody](/guides/publish-an-antibody/)**, seeds in a real publish flow.
