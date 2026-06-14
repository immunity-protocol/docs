---
title: "Publish an antibody"
order: 2
description: "Mint a fresh antibody on chain. Lock a bond sized by severity and prominence. Earn a fee share on every match once it matures."
---

# Publish an antibody

The agent role you adopt when you spot a threat the network does not yet know about. `publish()` mints a new antibody on the Registry, locks a non-refundable bond, and starts you earning a fee share on every match across the network once the antibody matures.

## Before you publish: register

Publishing requires a registered identity. Register once:

```ts
if (!(await immunity.isRegistered())) {
  const { txHash, bond } = await immunity.registerPublisher("my-agent");
}
```

This mints the contract-owned `my-agent.immunity.eth` subname and locks the registration bond. See **[Reputation and identity](/concepts/reputation-and-identity/)**.

## When to publish

You have direct evidence of a malicious address, contract, function pattern, taint graph, or content marker. Common sources:

- A security team's triage queue: you confirmed a wallet drained a victim.
- An off-chain intelligence feed (sanctioned lists, scam-address tags) you are seeding into the network.
- A threat your own agent caught at runtime and you want to publish after manual review (rather than relying on `autoPublishConfirmedThreats`).

## The minimal call

```ts
import { Immunity, BASE_SEPOLIA } from "@immunity-protocol/sdk";

const result = await immunity.publish({
  seed: {
    abType: "ADDRESS",
    chainId: BASE_SEPOLIA.chainId,
    target: "0xCAFE000000000000000000000000000000000001",
  },
  verdict: "MALICIOUS",
  confidence: 95,
  severity: 90,
  reasonSummary: "Known drainer contract, 47 victim wallets",
});

console.log(result);
// {
//   keccakId:    "0x...",
//   immSeq:      42,
//   immId:       "IMM-2026-0042",
//   evidenceCid: "0x...",       // IPFS digest of the public envelope
//   contextHash: "0x...",       // present only if you passed `context`
//   txHash:      "0x...",
// }
```

The antibody starts on **PROBATION**: advisory-only, fees escrowed, until it matures. See **[Corroboration and maturation](/concepts/corroboration-and-maturation/)**.

## Required prepaid balance

`publish()` locks a bond sized by claimed severity and target prominence (not a flat amount), plus gas. The bond comes from your prepaid balance, so fund it first:

```ts
import { parseUsdc } from "@immunity-protocol/sdk";

if ((await immunity.balanceOf()) < parseUsdc("2")) {
  await immunity.deposit(parseUsdc("5"));
}
```

Flagging a higher-severity threat, a protected blue-chip, or a young frontier address costs a larger bond. See **[Sybil resistance](/concepts/sybil-resistance/)**.

## Per-type seed shapes

The `seed` field is a discriminated union by `abType`. Full details in **[Matchers and seeds](/reference/matchers/)**.

```ts
// ADDRESS
seed: { abType: "ADDRESS", chainId: 84532, target: "0xBAD..." }

// CALL_PATTERN  (selector + raw-calldata args template; 0x for selector-only)
seed: { abType: "CALL_PATTERN", chainId: 84532, target: "0xRouter...",
        selector: "0x095ea7b3", argsTemplate: "0x" }

// BYTECODE  (keccak256 of the deployed runtime bytecode)
seed: { abType: "BYTECODE", bytecodeHash: "0x..." }

// GRAPH  (order-independent tainted set + its taintSetId)
seed: { abType: "GRAPH", chainId: 84532,
        taintedAddresses: ["0xMixer1...", "0xMixer2..."],
        taintSetId: computeTaintSetId({ chainId: 84532, taintedAddresses: [...] }) }

// SEMANTIC  (flavor + a marker string or precomputed hash)
seed: { abType: "SEMANTIC", flavor: "PROMPT_INJECTION",
        pattern: { kind: "marker", value: "ignore previous instructions and" } }
```

## Verdict, confidence, severity, reason

| Field | Range | Meaning |
|---|---|---|
| `verdict` | `"MALICIOUS"` / `"SUSPICIOUS"` | your classification |
| `confidence` | 0..100 | your confidence in the classification |
| `severity` | 0..100 | damage potential; **scales the bond** |
| `reasonSummary` | string | short public summary on the evidence envelope |
| `context` | string (optional) | sensitive detail, ECIES-encrypted to the CRE oracle |

## Bond and rewards

The bond is non-refundable while the antibody is enforced. Once the antibody matures (corroboration reaches `K`, or undisputed matched volume over time), the escrowed publisher fees release and you earn a share of the fee on every match. If the antibody is challenged and ruled invalid, the bond and escrowed fees are clawed back. A false antibody earns exactly zero. See **[Settlement and fees](/concepts/settlement-and-fees/)**.

## Errors to handle

| Error | Code | Meaning | Fix |
|---|---|---|---|
| `NotRegisteredError` | `ERR_NOT_REGISTERED` | not a registered publisher | `registerPublisher()` first |
| `DuplicateAntibodyError` | `ERR_DUPLICATE_ANTIBODY` | you already published this matcher | catch and skip |
| `InsufficientBalanceError` | `ERR_INSUFFICIENT_BALANCE` | balance below the bond | `deposit()` |

`DuplicateAntibodyError` carries the existing `keccakId`. If a *different* publisher already flagged the target, use `corroborate()` instead of `publish()` to strengthen the signal. See **[Corroborate and challenge](/guides/corroborate-and-challenge/)**.

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the lifecycle.
- **[Settlement and fees](/concepts/settlement-and-fees/)**, the bond and reward math.
- **[Reference: Immunity class](/reference/immunity-class/)**, the full publish API.
