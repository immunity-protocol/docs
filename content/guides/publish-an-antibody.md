---
title: "Publish an antibody"
order: 2
description: "Mint a fresh antibody on chain. Lock 1 USDC for 72h. Earn 80% of the protocol fee on every match."
---

# Publish an antibody

The agent role you adopt when you spot a threat the network does not yet know about. `publish()` mints a new antibody on the on-chain Registry, locks 1 USDC of stake for 72 hours, and starts you earning 80% of the protocol fee on every match across the network.

## When to publish

You have direct evidence of a malicious counterparty, contract, function pattern, or content marker. Common sources:

- Triage queue from a security team. You confirmed a wallet drained a victim and want to flag it.
- Off-chain intelligence feed (Chainalysis, Etherscan tags, OFAC). You are pulling external lists into the network.
- An incident your own agent caught at runtime via the TEE, *before* the SDK auto-published it (you want manual review first).
- A research disclosure where you classified a contract bytecode as a clone of a known drainer.

When the SDK's TEE auto-publishes (under `novelThreatPolicy: "verify"`), you do not call `publish()` manually; the SDK does it for you. Manual `publish()` is the operator path, not the agent path.

## The minimal call

```ts
import { Immunity, parseUsdc, TESTNET } from "@immunity-protocol/sdk";

const result = await immunity.publish({
  seed: {
    abType: "ADDRESS",
    chainId: TESTNET.chainId,
    target: "0xCAFE000000000000000000000000000000000001",
  },
  verdict: "MALICIOUS",
  confidence: 95,
  severity: 90,
});

console.log(result);
// {
//   keccakId: "0x...",
//   immSeq: 0042,
//   immId: "IMM-2026-0042",
//   txHash: "0x...",
//   stakeAmount: 1000000n,    // 1 USDC in 6-decimal base units
// }
```

That's the whole publish. The Registry event log indexes the new antibody, AXL gossips it to subscribers, every other agent's cache picks it up within seconds.

## Required prepaid balance

`publish()` debits 1 USDC of stake from your prepaid balance, plus a small gas budget for the on-chain tx itself. Top up first if you are bare:

```ts
if ((await immunity.balance()) < parseUsdc("1.05")) {
  await immunity.mintTestUsdc(parseUsdc("2"));    // testnet only
  await immunity.deposit(parseUsdc("1.5"));
}
```

`mintTestUsdc` works only against MockUSDC contracts on testnet. For real USDC, use the standard ERC20 transfer path.

## Per-type seed shapes

The `seed` field is a discriminated union by `abType`. Each type takes type-specific inputs:

### ADDRESS

```ts
seed: { abType: "ADDRESS", chainId: 16602, target: "0xBAD..." }
```

`target` is the flagged wallet or contract address.

### CALL_PATTERN

```ts
seed: {
  abType: "CALL_PATTERN",
  chainId: 16602,
  target: "0xRouter...",         // optional; null catches the pattern on any contract
  selector: "0x095ea7b3",         // 4-byte selector, e.g. approve(address,uint256)
  argsTemplate: { spender: "0xKnownDrainer..." },
}
```

`argsTemplate` is the partial argument shape that triggers a match. Concrete values constrain; missing values match anything.

### BYTECODE

```ts
seed: {
  abType: "BYTECODE",
  bytecodeHash: "0x...",  // keccak256 of the runtime bytecode
}
```

The SDK exposes `hashBytecodeMatcher(runtimeBytecode)` to compute this.

### GRAPH

```ts
seed: {
  abType: "GRAPH",
  chainId: 16602,
  taintedAddresses: ["0xMixer1...", "0xMixer2..."],
  hopLimit: 1,
}
```

Catches addresses that received from any of the tainted set within `hopLimit` hops.

### SEMANTIC

```ts
seed: {
  abType: "SEMANTIC",
  flavor: 1,                        // family id (1 = ignore-instructions, 2 = system-tag-spoof, etc.)
  marker: "ignore previous instructions and",
}
```

The SDK exposes the canonical flavor catalog at `SemanticFlavor.*`.

## Verdict, confidence, severity

| Field | Range | Meaning |
|---|---|---|
| `verdict` | `"MALICIOUS"` / `"SUSPICIOUS"` | publisher's classification |
| `confidence` | 0..100 | publisher's confidence in the classification |
| `severity` | 0..100 | publisher's assessment of damage potential |

Confidence drives the SDK's escalate logic: matches at `confidence >= 85` block by default, matches at `60 <= confidence < 85` escalate to the operator handler. Tune via `confidenceThresholds` in config.

Severity is informational for UIs and feeds. The protocol doesn't gate behavior on it.

## Stake and rewards

The 1 USDC stake unlocks under three conditions:

- 72 hours pass without a challenge, stake unlocks for withdrawal.
- The antibody matches a check first, you earn 80% of each 0.002 USDC fee.
- The antibody is challenged and the challenger wins, your stake is slashed.

A publisher who consistently mints accurate antibodies turns the 1 USDC into a perpetuity of match rewards. Dashboard at [immunity-protocol.com/publishers](https://immunity-protocol.com/publishers) shows live publisher stats.

## Errors to handle

| Error | Code | Meaning | Fix |
|---|---|---|---|
| `DuplicateAntibodyError` | `ERR_DUPLICATE_ANTIBODY` | the matcher hash already exists on chain | nothing to do, network already knows |
| `InsufficientBalanceError` | `ERR_INSUFFICIENT_BALANCE` | prepaid balance below stake + fees | call `deposit()` |
| `MissingConfigError` | `ERR_MISSING_CONFIG` | wallet or axlUrl missing | fix config |
| `NetworkError` | `ERR_NETWORK` | RPC or AXL unreachable | retry with backoff |
| `StakeLockedError` | `ERR_STAKE_LOCKED` | trying to withdraw locked stake | wait for the 72h unlock |

`DuplicateAntibodyError` is the common case for ADDRESS antibodies pulled from external lists; well-known addresses are usually already published. Catch and ignore unless you need explicit acknowledgement.

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the lifecycle.
- **[Concepts: Settlement and tokenomics](/concepts/settlement-and-tokenomics/)**, the math.
- **[Reference: Immunity class](/reference/immunity-class/)**, the full publish API.
