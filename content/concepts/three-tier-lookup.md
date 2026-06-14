---
title: "Three-tier lookup"
order: 3
description: "Every check walks three tiers, cheapest first. The chain is the source of truth, the cache is a shortcut, the CRE jury only fires for genuinely novel threats."
---

# Three-tier lookup

Every `check()` walks three tiers in order. Each tier answers the same question (do we already know this threat?) at progressively higher cost. The chain is the source of truth; the local cache is a performance shortcut on top of it; the CRE jury only fires when neither has seen the threat before.

```
┌────────────────────────────────────────────────────────────────┐
│  Tier 1, local cache                  ~1 ms                     │
│  in-memory matchers indexed by (chainId, address), selector,    │
│  bytecode hash, taint set, semantic marker                      │
│                                                                 │
│  miss ↓                                                         │
│                                                                 │
│  Tier 2, Base registry RPC            ~200 ms                   │
│  getAntibodyByMatcherHash(primaryMatcherHash) on Base           │
│  populates Tier 1 on hit so the next check resolves locally     │
│                                                                 │
│  miss ↓                                                         │
│                                                                 │
│  Tier 3, CRE jury                     seconds                   │
│  requestVerification on chain -> diverse-model CRE verdict      │
│  fires only for genuinely novel threats; can auto-publish the   │
│  resulting antibody so the next agent's Tier 1 catches it       │
└────────────────────────────────────────────────────────────────┘
```

Lookup finds a *matching* antibody. A separate read-side step then decides whether that match **hard-blocks or only warns**. See **[Two-speed enforcement](/concepts/two-speed-enforcement/)**.

## Why three tiers

Without Tier 2, an agent with a cold cache re-detects threats the network has already minted, wasting CRE calls and fragmenting the corroboration signal across duplicate antibodies. Tier 2 makes the chain (not the cache) the canonical record: a cold-cache agent finds the existing antibody on chain and pulls it into its cache instead of re-deriving it.

## What gets probed at each tier

### Tier 1, local cache

Five matchers run cheap-first; first hit wins.

| Matcher | Hashed input | Lookup shape |
|---|---|---|
| ADDRESS | `(chainId, target)` | `Map<"chainId:address", Antibody>` |
| CALL_PATTERN | `(chainId, target, selector, argsTemplate)` | `Map<"chainId:target:selector:argsHash", Antibody>` |
| GRAPH | `(chainId, sorted addresses)` | reverse `Map<"chainId:address", Set<keccakId>>` |
| BYTECODE | `keccak256(runtime bytecode)` | `Map<bytecodeHash, Antibody>` |
| SEMANTIC | flavor + marker | scan over markers |

### Tier 2, Base registry RPC

When Tier 1 misses, the SDK builds candidate primary-matcher hashes from the tx and context, then queries the Registry on Base for each one until it finds a hit (or exhausts the candidates). On a hit the antibody is decoded once and pushed into the local cache so the next check serves it locally.

A short-lived **negative cache** suppresses repeated RPC traffic for the same legitimate-but-uncommon counterparty. Entries carry a TTL, so a freshly minted threat becomes visible after at most that window even without a cache reset.

### Tier 3, CRE jury

When the cache and the chain are both empty for a given input and `novelThreatPolicy: "verify"` is set, the SDK posts the distilled, ECIES-encrypted context to the chain via `requestVerification` (the agent's wallet pays the check fee) and awaits the Chainlink CRE jury's DON-attested verdict. On a confirmed threat, if you opted into `autoPublishConfirmedThreats`, the SDK publishes the synthesized antibody so subsequent agents catch the same threat at Tier 1 or 2.

`trust-cache` skips Tier 3 and allows the action with `novel: true`. `deny-novel` blocks unconditionally on a Tier 1 + Tier 2 miss. If no verifier is available, the `verify` path fails **closed**: a novel input is never silently allowed.

See **[Novel-threat verification](/concepts/novel-threat-verification/)** for the full CRE attestation story and its limits.

## Decision source

The `source` field on a returned `CheckResult` tells you which tier resolved:

| value | meaning |
|---|---|
| `"cache"` | Tier 1 hit |
| `"registry"` | Tier 2 hit (cache miss + chain hit) |
| `"tee"` | Tier 3 hit (CRE verdict, possibly auto-published) |
| `"policy"` | no tier hit; `deny-novel` or `trust-cache` decided |

The `novel` flag is true only for `"policy"`-sourced allows under `trust-cache`.

## Failure modes

- **RPC unavailable.** The Tier-2 lookup swallows fetch errors and falls through to the policy fork. The SDK degrades to two-tier behavior; cache hits still work, novel threats still reach CRE under `verify`.
- **No verifier configured.** Under `verify`, a missing verifier fails closed (the novel input is not silently allowed).
- **Stale negative cache.** Entries expire on a TTL, so a freshly minted threat surfaces after at most one window.

## See also

- **[Two-speed enforcement](/concepts/two-speed-enforcement/)**, how a matched antibody becomes advisory or hard-block.
- **[Novel-threat verification](/concepts/novel-threat-verification/)**, what Tier 3 actually does.
- **[Reference: CheckResult](/reference/checkresult/)**, every field on the returned object.
