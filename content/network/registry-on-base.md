---
title: "Registry on Base"
order: 1
description: "The on-chain core on Base is the source of truth. Anyone can read it without an SDK install. Live deployed addresses included."
---

# Registry on Base

The on-chain core is the canonical source of truth for the Immunity network, deployed on **Base**. Every antibody, bond, fee settlement, corroboration, maturation, and challenge lives here. The cache is a derivative; the public feed is a derivative. **The chain is the truth.**

This page is the read-only reference for verifying anything you see in any other layer.

## Live deployment (Base Sepolia)

The full core suite, as shipped in the SDK's `BASE_SEPOLIA` preset. Cross-reference any of these on [Basescan](https://sepolia.basescan.org).

| Contract | Address |
|---|---|
| Registry | `0x15F177B17884B991703300C2dcCBA790Dda33fbC` |
| Reputation | `0x436510F3382F67bDF1eE4B6c4b6f940Eb492b3c4` |
| Registrar | `0x55237bE657245A6bf223D4b721A72b8e1D2E8523` |
| ProtectedSet | `0x8b20aE052F9391e7b071A262aDa201F2189A1901` |
| ChallengeManager | `0xc05ffEA7657d9F2c8879342cDAa2bE0eF238F04d` |
| CRE receiver | `0xc4f843aac2C94ce2D349C166d1D8D58cb7049C66` |
| NovelVerification | `0x0f3733f4683029771E7730288339B460Eb377435` |
| USDC (testnet) | `0xe697EF7724453F239D8c0EB9295D87C344D9CE60` |
| L2Registry (ENS Durin) | `0xc647c0693ca93D2Ee5681C2eE7AF02d18C76F3B5` |

Base mainnet is not yet deployed; it is an audit-gated push after the testnet system is proven. The SDK's `BASE_MAINNET` preset is a zeroed placeholder until then.

## What each contract owns

| Contract | Responsibility |
|---|---|
| **Registry** | antibodies, bonds, fee escrow and release, corroboration sets, maturation, lifecycle, TTL |
| **Reputation** | on-chain publisher reputation; written only by Registry and ChallengeManager |
| **Registrar** | `registerPublisher` -> mints the contract-owned `*.immunity.eth` subname, locks the bond |
| **ProtectedSet** | the curated blue-chip list; read by Registry for bond scaling and by the hook |
| **ChallengeManager** | the challenge state machine; intakes the CRE verdict and settles slash/uphold |
| **CRE receiver** | accepts DON-attested verdicts `onlyForwarder` from the pinned workflow |
| **NovelVerification** | the Tier-3 trigger: `requestVerification` for a novel check |

## Reading the chain

You need no balance, no auth, and no SDK to read state. Use any RPC client. The fast path the SDK uses for Tier-2 lookups is `getAntibodyByMatcherHash(primaryMatcherHash)`: pass a type-specific matcher hash, get the antibody back.

```ts
import { Contract, JsonRpcProvider } from "ethers";
import { hashAddressMatcher, decodeAntibody } from "@immunity-protocol/sdk";

const provider = new JsonRpcProvider("https://sepolia.base.org");
const registry = new Contract(
  "0x15F177B17884B991703300C2dcCBA790Dda33fbC",
  REGISTRY_ABI,
  provider,
);

const matcherHash = hashAddressMatcher({ chainId: 84532, target: "0xCAFE..." });
const raw = await registry.getAntibodyByMatcherHash(matcherHash);
const antibody = decodeAntibody(raw);
```

The SDK also re-exports higher-level readers you can use directly against the deployed contracts:

- `Tier2Lookup`, the on-chain matcher lookup,
- `ReputationClient`, read a publisher's reputation,
- `decodeAntibody` / `decodeEnforcementInputs`, turn raw structs into typed objects,
- `classifyEnforcement`, derive advisory vs hard-block from those inputs.

## Verifying any claim

Every claim made anywhere in the stack should reduce to an on-chain read. "This antibody is real" is `getAntibodyByMatcherHash` plus `decodeAntibody`. "Is this address hard-blocked?" is `decodeEnforcementInputs` plus `classifyEnforcement` (or a Mirror read, see [The mirror and on-chain consumers](/concepts/the-mirror-and-consumers/)). "What is this publisher's reputation?" is `ReputationClient`.

## Why this matters

A network you have to trust is a network that can quietly redefine itself. The core exposes every claim as a public read. Run your own RPC, your own cross-references, your own dashboards. No permission, no SDK, no account required.

## See also

- **[Network: economics](/network/economics/)**, the fee, bond, and treasury model.
- **[Network: the public feed](/network/the-public-feed/)**, the chain's derivative views.
- **[Reference: Network presets](/reference/network-presets/)**, these addresses as SDK constants.
