---
title: "Three-tier lookup"
order: 2
description: "Every check walks three tiers, cheapest first. The chain is the source of truth, the cache is a shortcut, the TEE only fires for genuinely novel threats."
---

# Three-tier lookup

Every `check()` walks three tiers in order. Each tier resolves a different question (do I already know this threat?) at progressively higher cost. The chain is the source of truth; the cache is a performance shortcut on top of it; TEE detection only fires when neither has seen the threat before.

```
┌────────────────────────────────────────────────────────────────┐
│  Tier 1, local cache                  ~1 ms                    │
│  in-memory matchers indexed by (chainId, address), selector,   │
│  bytecode hash, taint set, marker substring                    │
│                                                                │
│  miss ↓                                                        │
│                                                                │
│  Tier 2, registry RPC                 ~200 ms                  │
│  on-chain matcherIndex(primaryMatcherHash) -> keccakId         │
│  populates Tier 1 on hit so the next check resolves locally    │
│                                                                │
│  miss ↓                                                        │
│                                                                │
│  Tier 3, TEE detection                ~3 s                     │
│  0G Compute (qwen-2.5-7b) inference + structured verdict       │
│  fires only for genuinely novel threats; auto-publishes the    │
│  resulting antibody so the next agent's Tier 1 catches it      │
└────────────────────────────────────────────────────────────────┘
```

## Why three tiers

Without Tier 2, an agent with a cold cache re-detects and re-publishes any antibody the network has already minted. Three problems:

- **Duplicate antibodies.** The same threat gets multiple `keccakId`s, each with their own divided economic claim.
- **Wasted TEE calls.** Every cold-cache agent burns a 0G Compute inference on threats the chain already knew about.
- **Broken publisher economics.** The first publisher's stake competes for matches against subsequent publishers' duplicates.

Tier 2 closes the gap by making the chain (not the cache) the canonical record. The contract enforces uniqueness via `matcherIndex` and reverts second-publisher attempts with `AntibodyAlreadyExistsForMatcher(existingKeccakId)`. The SDK preflights the same lookup so the common case never reaches the chain reverted.

## What gets probed at each tier

### Tier 1, local cache

Five matchers run cheap-first; first hit wins.

| Matcher | Hashed input | Lookup shape |
|---|---|---|
| ADDRESS | `(chainId, target)` | `Map<"chainId:address", Antibody>` |
| CALL_PATTERN | `(chainId, target, selector, argsTemplate)` | `Map<"chainId:target:selector:argsHash", Antibody>` |
| GRAPH | `(chainId, sorted addresses)` | reverse `Map<"chainId:address", Set<keccakId>>` |
| BYTECODE | `keccak256(runtime bytecode)` | `Map<bytecodeHash, Antibody>` |
| SEMANTIC | flavor + marker substring | linear scan over markers |

### Tier 2, registry RPC

When Tier 1 misses, the SDK builds a list of candidate primary matcher hashes from the tx and context, then queries `Registry.getAntibodyByMatcherHash(hash)` for each one until it finds a hit (or exhausts the candidates).

Today the candidate set covers ADDRESS-shaped lookups: `tx.to` and `context.counterparty.id` if either parses as a hex address. SEMANTIC and BYTECODE are richer matchers handled by Tier 1 already, so Tier 2 skips them.

A short **negative cache** (5 min TTL, evicted on incoming gossip) prevents repeated RPC traffic for the same legitimate-but-uncommon counterparty. AXL gossip evicts the entry as soon as a freshly-published antibody arrives, so a freshly-minted threat is visible within one gossip round-trip. The 5-minute TTL is the worst-case fallback.

The lookup reuses the existing `RegistryClient.contract` provider, no new connection. On hit, the antibody is decoded once and pushed into the local cache so the next check serves it locally.

### Tier 3, TEE detection

When the cache and the chain are both empty for a given input, `novelThreatPolicy: "verify"` triggers a 0G Compute inference against the `qwen-2.5-7b-instruct` provider. Verdicts come back as strict JSON. On `block`, the SDK auto-publishes the synthesized antibody so subsequent agents catch the same threat at Tier 1 (or 2, after the chain mints).

`trust-cache` skips Tier 3 and allows the action with `novel: true` flagged on the result. `deny-novel` blocks unconditionally on a Tier 1 + Tier 2 miss.

See **[TEE verification](/concepts/tee-verification/)** for the full attestation story and the limits.

## Decision source

The `source` field on a returned `CheckResult` tells you which tier resolved:

| value | meaning |
|---|---|
| `"cache"` | Tier 1 hit |
| `"registry"` | Tier 2 hit (cache miss + chain hit) |
| `"tee"` | Tier 3 hit (TEE inference + auto-publish) |
| `"policy"` | no tier hit; `deny-novel` or `trust-cache` decided |

The `novel` flag is true only for `"policy"`-sourced allows under `trust-cache`.

## Failure modes

- **RPC unavailable.** `Tier2LookupClient` swallows fetch errors and falls through to the policy fork. The SDK degrades to two-tier behavior; cache hits still work, novel threats still go to TEE under `verify`.
- **Race on publish.** Two SDK instances publishing the same matcher hash within a block: the SDK preflight catches the common case; the contract revert (`AntibodyAlreadyExistsForMatcher`) covers the race. Both surface as a typed `MatcherAlreadyClaimedError` carrying the existing `keccakId`.
- **Stale negative cache.** AXL gossip evicts entries on incoming antibodies, so a freshly-minted threat is visible within one gossip round-trip. The 5-minute TTL is the worst-case fallback.

## See also

- **[TEE verification](/concepts/tee-verification/)**, what Tier 3 actually does.
- **[Settlement and tokenomics](/concepts/settlement-and-tokenomics/)**, why the fee is paid every settled tier.
- **[Reference: CheckResult](/reference/checkresult/)**, every field on the returned object.
