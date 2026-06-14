---
title: "Novel-threat verification"
order: 8
description: "When the CRE jury fires, what it verifies, and the honest caveats about how decentralized that verification really is today."
---

# Novel-threat verification

Novel-threat verification is the third tier of `check()`. It only fires when the local cache misses **and** the on-chain Registry has no matching antibody for the input. That combination defines a "novel" threat: nobody on the network has seen it before. Tier 3 runs on **Chainlink CRE** (the Chainlink Runtime Environment), whose decentralized oracle network (DON) produces an attested verdict.

## When it fires

Three preconditions must all be true:

1. The agent's `novelThreatPolicy` is `"verify"` (the SDK default).
2. Tier 1 (cache) and Tier 2 (registry) both missed.
3. A verifier is available. On Base Sepolia the SDK builds the CRE verifier automatically from the network config; you can also inject a custom `verifier`.

Under `"trust-cache"` the SDK skips this tier and returns `{ allowed: true, novel: true }`. Under `"deny-novel"` it blocks unconditionally. If `verify` is set but no verifier is available, the path fails **closed**: a novel input is never silently allowed.

## What gets verified

The SDK distills the agent's input into a compact bundle:

- The proposed `tx` (decoded calldata where possible, raw bytes otherwise).
- The conversation context (recent turns plus relevant tool calls).
- The counterparty (address, ENS, source attribution).

That bundle is **ECIES-encrypted to the CRE oracle's public key** (`creOraclePublicKey` in the network config), uploaded to storage, and referenced from an on-chain `requestVerification(checkId, evidenceCid, contextHash)` call that the agent's wallet pays the fee for. The Chainlink DON picks up the request, decrypts the context inside its confidential compute (only the DON holds the matching private key, in a Chainlink Vault DON), runs an LLM evaluation over it via Confidential HTTP, and writes back a DON-attested verdict:

```json
{
  "verdict": "MALICIOUS",
  "abType": "ADDRESS",
  "flavor": null,
  "confidence": 92,
  "severity": 88,
  "reasoning": "calldata approves MAX_UINT256 to a known drainer address pattern",
  "marker": null
}
```

The verdict is delivered on chain through the `KeystoneForwarder` (the receiver accepts reports `onlyForwarder` from a pinned workflow id and owner), and the SDK reads it back with the attestation commitment bound to the verdict fields.

## What happens after

- **Confirmed threat** (`MALICIOUS` over the block threshold). The SDK blocks the action. If you set `autoPublishConfirmedThreats` and your wallet is a registered publisher with balance for the bond, it also publishes the synthesized antibody (surfaced as `CheckResult.pendingWrite`), carrying the DON attestation. The next agent catches the same threat at Tier 1 or 2.
- **Escalate band.** A `SUSPICIOUS` verdict in the escalate band invokes your `onEscalate` handler. See **[Operator in the loop](/guides/operator-in-the-loop/)**.
- **Benign.** The SDK returns `{ allowed: true, source: "tee" }`. No publish.

The strict JSON parser never extracts free text into anything that becomes a matcher. Only the enum fields and bounded numerics are trusted; the `reasoning` string is carried into the public envelope as a summary but never used to derive a matcher.

## What attestation actually guarantees

This is where honesty matters. The CRE / DON attestation proves:

- **The verdict was produced and signed by the pinned Immunity CRE workflow.** The on-chain receiver only accepts reports delivered by the `KeystoneForwarder` for a pinned `workflowId` and owner, so a third party cannot forge a verdict.
- **The context stayed confidential.** It is encrypted to the oracle key and decrypted only inside the DON's confidential compute; the plaintext is never on chain or in the public envelope.

It does **not** prove:

- **That a specific model ran in a hardware enclave you control.** The LLM evaluation reaches a model provider (Claude / GPT / Gemini) over Confidential HTTP from inside the DON. The model itself is a centralized API.
- **That the verdict is unbiased.** A single model can be wrong or steered. Tier-3 novel verification is one CRE verdict; the *challenge* jury hardens this by running three **different** model providers and requiring a 2/3 supermajority. See **[The challenge game and jury](/concepts/challenge-game-and-jury/)**.

Model diversity across centralized providers is the v1 defense against single-provider injection and bias; open-model and decentralized compute are on the roadmap.

## What it costs

A novel-threat round-trip draws the per-check fee from your prepaid balance (which funds the CRE compute) plus gas for the `requestVerification` call, and, if it auto-publishes, the publish bond. Cache hits and registry hits never reach Tier 3.

## Why bother

A network without novel-threat verification cannot detect anything genuinely new; SDK matchers cover known threats only. Tier 3 is the **bootstrap mechanism** for the threat catalog: it lets a novel attack get classified once, attested, and published, so it never reaches Tier 3 again. As the catalog grows, the overwhelming majority of checks resolve at Tier 1 in microseconds.

## See also

- **[Three-tier lookup](/concepts/three-tier-lookup/)**, where this fits in the bigger picture.
- **[The challenge game and jury](/concepts/challenge-game-and-jury/)**, the diverse-model 2/3 jury that resolves disputes.
- **[Network: Registry on Base](/network/registry-on-base/)**, how to verify on-chain state yourself.
