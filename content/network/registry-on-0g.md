---
title: "Registry on 0G"
order: 1
description: "The on-chain Registry contract is the source of truth. Anyone can read it without an SDK install."
---

# Registry on 0G

The on-chain Registry is the canonical source of truth for the Immunity network. Every antibody mint, every match settlement, every challenge, lives here. The cache is a derivative; the gossip mesh is a derivative; the public feed is a derivative. **The Registry is the truth.**

This page is the read-only reference for verifying anything you see in any other layer.

## Live deployment

| Network | Registry | MockUSDC |
|---|---|---|
| Galileo testnet | `0xbbD14Ff50480085cA3071314ca0AA73768569679` | `0x39D484EaBd1e6be837f9dbbb1DE540d425A70061` |
| Mainnet | not yet deployed | n/a |

Cross-reference at [chainscan-galileo.0g.ai](https://chainscan-galileo.0g.ai).

## Read-only methods anyone can call

These views require no balance, no auth, no approval. Any RPC client works.

### `getAntibody(keccakId) -> Antibody`

Read a published antibody by id. Returns the full struct (see [Antibody reference](/reference/antibody/)).

```ts
import { Contract, JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

const ab = await registry.getAntibody("0x...keccakId");
console.log(ab);
```

### `getAntibodyByImmSeq(immSeq) -> Antibody`

Same struct, indexed by sequential id (`uint64`).

```ts
const ab = await registry.getAntibodyByImmSeq(42);
```

### `getAntibodyByMatcherHash(primaryMatcherHash) -> Antibody`

The fast path the SDK uses for Tier 2 lookups. Pass the type-specific matcher hash; returns the antibody if present, reverts on miss.

```ts
const matcherHash = hashAddressMatcher(16602, "0xCAFE...");
const ab = await registry.getAntibodyByMatcherHash(matcherHash);
```

### `firstMatch(matcherHashes[]) -> (Antibody, uint256)`

Batched candidate lookup. Pass an array of candidate hashes; the contract returns the first match found and its index in your array. Returns `(default, 0)` if no match.

The SDK uses this internally for Tier 2 to reduce round-trips when probing multiple candidate matchers (e.g., `tx.to` AND `context.counterparty.id`).

### `treasuryBalance() -> uint256`

Current treasury balance in 6-decimal USDC base units.

```ts
const balance = await registry.treasuryBalance();
console.log(`treasury: ${formatUsdc(balance)} USDC`);
```

### `prepaidBalance(address) -> uint256`

The prepaid USDC balance for a specific agent address.

```ts
const myBalance = await registry.prepaidBalance(agentAddress);
```

## Write methods (require gas + USDC)

### `check(antibodyId, tokenAddress, tokenAmount, originChainId) -> Receipt`

Settles a check. Debits 0.002 USDC from the caller's prepaid balance. The SDK calls this for every Tier 1 / Tier 2 / Tier 3 hit.

`antibodyId == 0` signals "no match found"; the protocol fee still applies and goes 100% to the treasury.

### `publish(seed, verdict, confidence, severity, evidenceCid, contextHash, embeddingHash, attestation) -> Antibody`

Mints a new antibody. Locks 1 USDC of stake for 72 hours. The SDK wraps this into the high-level `publish()` method.

### `deposit(amount)` / `withdraw(amount)`

Top up / pull out the prepaid USDC balance. The SDK exposes both as facade methods.

### `challenge(keccakId, evidenceCid)`

File a challenge against an antibody. Requires a stake from the challenger (currently 1 USDC). Adjudication is governance-driven in v1; on-chain optimistic disputes are roadmapped for v2.

## Verifying any claim against the Registry

Every claim made anywhere in the Immunity stack should reduce to a Registry view call. Examples:

### "This antibody is real"

```ts
const ab = await registry.getAntibody(claimedKeccakId);
// throws AntibodyNotFoundError if forged
```

### "This is the first publisher for this matcher"

```ts
const ab = await registry.getAntibodyByMatcherHash(matcherHash);
console.log(`first publisher: ${ab.publisher}`);
```

### "This SDK provider is who they say they are"

The Registry exposes the inference services list (used by 0G Compute). Read it with:

```ts
const inferenceServingContract = new Contract(
  "0xa79F4c8311FF93C06b8CfB403690cc987c93F91E",  // testnet Inference contract
  INFERENCE_ABI,
  provider,
);
const [services] = await inferenceServingContract.getAllServices(0, 50);
for (const s of services) {
  console.log({
    provider: s.provider,
    model: s.model,
    verifiability: s.verifiability,
    additionalInfo: JSON.parse(s.additionalInfo),
  });
}
```

A provider claiming `verifiability: "TeeML"` should have `additionalInfo.ImageDigest` set if their TEE truly attests the model image. Anyone can verify the consistency.

## Why this matters

A network that you have to trust is a network that can quietly redefine itself. The Registry exposes every claim as a public view. Run your own RPC, run your own cross-references, run your own dashboards. You do not need permission, you do not need an SDK, you do not need an account.

## See also

- **[Network: economics](/network/economics/)**, real measured numbers from live demo.
- **[Network: the public feed](/network/the-public-feed/)**, the registry's derivative views.
- **[Reference: Antibody](/reference/antibody/)**, the struct shape returned by these views.
