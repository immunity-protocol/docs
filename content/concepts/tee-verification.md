---
title: "TEE verification"
order: 3
description: "When the TEE fires, what it verifies, and the honest caveats about how decentralized that verification really is today."
---

# TEE verification

TEE verification is the third tier of `check()`. It only fires when the local cache misses **and** the on-chain Registry has no record of a matching antibody for the input. That combination defines a "novel" threat: nobody on the network has seen it before.

## When it fires

Three preconditions must all be true:

1. The agent's `novelThreatPolicy` is `"verify"` (the SDK default).
2. Tier 1 (cache) and Tier 2 (registry) both missed.
3. The proposed action surfaced something the SDK can encode into a verifier prompt: a tx, scraped content, or counterparty data.

Under `"trust-cache"` the SDK skips this tier entirely and returns `{ allowed: true, novel: true }`. Under `"deny-novel"` it blocks unconditionally. The TEE round-trip is the only way to actually classify a novel input as malicious or benign.

## What gets verified

The SDK builds a structured prompt from the agent's input:

- The proposed `tx` (decoded calldata where possible, raw bytes otherwise).
- The conversation context (recent turns plus relevant tool calls).
- The counterparty (address, ENS, any source attribution).

Encrypted to the enclave's public key, posted to the 0G Compute provider running `qwen-2.5-7b-instruct`. The provider runs the inference inside a Trusted Execution Environment, signs the verdict with the enclave's private key, and returns a strict JSON envelope:

```json
{
  "decision": "block",
  "verdict": "MALICIOUS",
  "confidence": 92,
  "severity": 88,
  "reason": "calldata approves MAX_UINT256 to a known drainer address pattern",
  "publishSeed": { "abType": "ADDRESS", "chainId": 16602, "target": "0xCAFE..." }
}
```

The SDK validates the JSON shape and the attestation signature before acting on it.

## What happens after

- `decision: "block"` plus a recoverable `publishSeed`, the SDK auto-publishes a fresh antibody. The next agent catches the same threat at Tier 1 (or Tier 2 if its cache is cold).
- `decision: "block"` without a recoverable seed, the SDK still blocks the current action but cannot mint. Most ADDRESS-shaped tx blocks recover a seed deterministically; SEMANTIC blocks recover only when `semanticAutoMint: true` and the model returned a valid marker substring.
- `decision: "allow"`, the SDK returns `{ allowed: true, source: "tee", novel: false }`. No publish. No further action.
- `decision: "escalate"`, the SDK invokes the `onEscalate` handler if configured. See **[Operator in the loop](/guides/operator-in-the-loop/)**.

## What attestation actually guarantees

This is where honesty matters. The 0G Compute attestation chain proves:

- **A specific TEE signed this output.** You can verify the signature against an on-chain registry of acknowledged TEE signers.
- **The TEE was running inside a hardware enclave.** The dstack verifier (currently v0.5.x) checks the platform attestation quote against Intel SGX or AMD SEV root keys.

It does **not** prove:

- **Which model code ran.** The attestation binds to the broker container, not the model container. Most providers' on-chain `additionalInfo.ImageDigest` is empty, meaning even the broker container is not pinned by digest.
- **That the model was loaded from a known weight set.** Verifying weights would require a separate measurement; today providers do not publish one.
- **That the inference was done locally.** Some providers register `verifiability: "TeeML"` (model-in-enclave) but self-declare `ProviderType: "centralized"` and `ProviderIdentity: "aliyun"` in the same struct, indicating the actual LLM call hits a centralized hosting plane behind a TEE-protected proxy. **TeeTLS** is the canonical name for that mode; some providers advertise TeeML but operate closer to TeeTLS in practice.

You can verify each provider's claims yourself by reading the on-chain `Registry` for inference services. See **[Registry on 0G](/network/registry-on-0g/)** for the exact contract calls.

## What it costs

Per call, on average:

- **Settlement gas** for the on-chain `Registry.check()` settlement: ~49k gas, ~$0.0001 at typical 0G mainnet pricing.
- **0G Compute inference fee**: ~$0.00015 per qwen-2.5-7b-instruct call at the current testnet rate. Mainnet rates vary by provider.
- **Auto-publish gas** if the verdict mints a new antibody: ~248k gas for an ADDRESS antibody, ~$0.0005 at typical pricing. Plus the 1 USDC publisher stake (refundable).

A typical novel-threat round-trip: ~$0.00025 if no auto-publish, ~$0.00075 plus stake if it does. Cache hits and registry hits both pay only the protocol fee ($0.002), no TEE cost.

## Why bother

A network without TEE verification cannot detect anything genuinely new. SDK matchers cover known threats only. Without a verifiable inference loop, the network is static. With it, agents collectively learn faster than any single team could publish manually.

The honest framing is: TEE verification is the **bootstrap mechanism** for the network's threat catalog. As the catalog grows, fewer checks reach Tier 3. After a year of operation, well over 99% of checks resolve at Tier 1 in microseconds. The TEE is what ever lets a novel attack get classified once, so it never reaches Tier 3 again.

## See also

- **[Three-tier lookup](/concepts/three-tier-lookup/)**, where this fits in the bigger picture.
- **[Operator in the loop](/guides/operator-in-the-loop/)**, what to do with a SUSPICIOUS verdict.
- **[Registry on 0G](/network/registry-on-0g/)**, how to verify provider claims yourself.
