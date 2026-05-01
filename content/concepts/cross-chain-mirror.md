---
title: "Cross-chain mirror"
order: 5
description: "ADDRESS antibodies on 0G Chain mirror to Ethereum and L2s so Uniswap v4 hooks can block flagged tokens at the pool level."
---

# Cross-chain mirror

The Registry lives on 0G Chain. That is where antibodies mint, where the publisher economics settle, where the canonical record exists. But the actual *use* of an ADDRESS antibody often happens on a different chain entirely: a Uniswap v4 pool on Sepolia checks an inbound swap's token against the network's blocklist. The pool cannot read 0G Chain natively. The cross-chain **mirror** bridges that gap.

## What gets mirrored

Only **ADDRESS** antibodies. The other four types (CALL_PATTERN, BYTECODE, GRAPH, SEMANTIC) live in the cache and are queried at SDK level. ADDRESS antibodies, by contrast, need to be queried by an on-chain hook in the swap path itself, with no off-chain SDK in the loop.

The mirror is a one-way push: 0G Chain (source of truth) to N target chains (consumers).

## How it works

```
0G Chain (Galileo)               relayer process            target chain (Sepolia)
                                                            
  Registry.publish()                                        
        │                                                   
        │ AntibodyMinted event                              
        ▼                                                   
  event log indexed                                         
        │                                                   
        │ relayer reads log,                                
        │ verifies signature,                               
        │ computes target tx                                
        ▼                                                   
                              Mirror.replicate(             
                                keccakId, target,           
                                chainId, signature)          
                                       │                    
                                       ▼                    
                              MirrorRegistry contract        
                              stores keccakId -> target      
                                       │                    
                                       ▼                    
                              Uniswap v4 hook reads          
                              MirrorRegistry on swap         
                              and reverts if flagged         
```

The relayer is a permissionless process. Anyone can run one; the protocol publishes a reference implementation. The relayer pays target-chain gas to push events; in exchange, when a hook-protected swap reverts, the relayer that posted the matching antibody to that chain earns a small bounty.

## Supported chains today

| Chain | Status | Mirror address |
|---|---|---|
| Ethereum mainnet | Roadmap, post-mainnet-launch | n/a |
| Sepolia | Live, demo only | published in the SDK constants |
| Base | Roadmap | n/a |
| Arbitrum One | Roadmap | n/a |

The Sepolia mirror powers the live Uniswap v4 hook demo at [immunity-protocol.com/dex](https://immunity-protocol.com/dex). Try a swap against a flagged token; the pool reverts on chain with the friendly hook error.

## What you can verify

Anyone can read the Sepolia mirror state without an SDK install:

```
contract MirrorRegistry {
    function isMirrored(bytes32 keccakId) external view returns (bool);
    function targetOf(bytes32 keccakId) external view returns (address);
    function lastReplicatedAt(bytes32 keccakId) external view returns (uint256);
}
```

Cross-reference any ADDRESS antibody on the 0G Registry against the Sepolia mirror to confirm propagation. Latency is typically under one block on the target chain after the source-chain event indexes.

## Trust model

The mirror is **observation-only**. It cannot mint new antibodies; it only replicates already-minted ones from 0G to the target chain. The risk surface is "delayed propagation" not "false propagation":

- Relayer downtime, antibodies mint on 0G but do not appear on Sepolia until a relayer comes back.
- Network partition between 0G and the target chain, same effect.
- Relayer fork at the source-chain level, ambiguous, the relayer must wait for finality on 0G before pushing.

A malicious relayer cannot inject antibodies that do not exist on 0G; the target-chain `Mirror.replicate()` verifies the source-chain signature before storing. A malicious target-chain operator cannot delete antibodies from the mirror without the same signature dance.

## Why this matters for Uniswap

Uniswap v4 hooks let a pool deployer install logic that runs on every swap. The Immunity hook reads the mirror for the input/output tokens of the swap and reverts the swap if either is flagged. This is **collective LP protection**, the LP does not need to install an SDK; the hook protects every swapper automatically.

See **[Guides: Uniswap v4 hook](/guides/uniswap-v4-hook/)** for installation and a runnable example.

## See also

- **[Antibodies](/concepts/antibodies/)**, the lifecycle of a single antibody.
- **[Guides: Uniswap v4 hook](/guides/uniswap-v4-hook/)**, the canonical mirror consumer.
- The live cross-chain demo, [immunity-protocol.com/dex](https://immunity-protocol.com/dex).
