---
title: "Errors"
order: 5
description: "Full taxonomy of SDK errors with stable codes for runtime branching."
---

# Errors

All SDK errors extend `ImmunityError`. Branch on the stable `code` string, not the message text. Messages may change between versions; codes do not.

```ts
import { ImmunityError } from "@immunity-protocol/sdk";

try {
  await immunity.check(tx, ctx);
} catch (err) {
  if (err instanceof ImmunityError) {
    switch (err.code) {
      case "ERR_INSUFFICIENT_BALANCE":
        await immunity.deposit(parseUsdc("0.5"));
        return safeSend(tx, ctx);  // retry
      case "ERR_NETWORK":
        return null;  // degrade gracefully
      default:
        throw err;
    }
  }
  throw err;
}
```

## Full table

| Class | Code | Cause | Typical fix |
|---|---|---|---|
| `MissingConfigError` | `ERR_MISSING_CONFIG` | construction missing `wallet` or `axlUrl` | fix config |
| `NotStartedError` | `ERR_NOT_STARTED` | called any method before `start()` | call `start()` first |
| `BlockError` | `ERR_BLOCKED` | hard policy block (e.g. `deny-novel` short-circuit) | not retryable; the action is denied |
| `EscalationError` | `ERR_ESCALATION_TIMEOUT` | `onEscalate` did not resolve within `escalationTimeout` | tune timeout or improve handler |
| `EscalationError` | `ERR_ESCALATION_DENIED` | operator returned `false` from `onEscalate` | as designed; not retryable |
| `EscalationError` | `ERR_ESCALATION_NO_HANDLER` | escalate verdict but no handler configured | set `onEscalate` in config |
| `InsufficientBalanceError` | `ERR_INSUFFICIENT_BALANCE` | prepaid USDC below the fee or stake | call `deposit()` |
| `NetworkError` | `ERR_NETWORK` | RPC or AXL unreachable | retry with backoff; check infra |
| `AntibodyNotFoundError` | `ERR_ANTIBODY_NOT_FOUND` | `getAntibody(id)` for an unknown id | nothing to do |
| `DuplicateAntibodyError` | `ERR_DUPLICATE_ANTIBODY` | matcher hash already exists on chain | catch and skip; the network already knows |
| `StakeLockedError` | `ERR_STAKE_LOCKED` | tried to withdraw locked stake | wait for the 72h unlock |
| `TeeAttestationError` | `ERR_TEE_ATTESTATION` | TEE response failed signature verification | one retry, then degrade to `trust-cache` |
| `TeeResponseError` | `ERR_TEE_RESPONSE` | TEE returned malformed JSON | log and degrade to `trust-cache` |

## Class details

### `ImmunityError`

The abstract base. `instanceof ImmunityError` matches every SDK-internal error. Carries `code: string` and `message: string`.

```ts
class ImmunityError extends Error {
  readonly code: string;
  constructor(code: string, message: string);
}
```

Plain `Error` instances thrown by the SDK are extremely rare and indicate a bug. Report them.

### `MissingConfigError`

Construction-time. The SDK is being instantiated without a required field. Recovery is always "fix the config".

### `NotStartedError`

You called `check`, `publish`, or any other lifecycle-dependent method before `start()`. Idempotent recovery: call `start()` then retry the original method.

### `BlockError`

A **hard** block from policy, not from a matched antibody. Today this fires only when:
- `novelThreatPolicy: "deny-novel"` and no candidate matcher could be constructed.
- The TEE response said `block` AND a critical attestation step failed.

Most agents will never see this; ordinary blocks come back via `result.allowed === false`, not via `BlockError`.

### `EscalationError` family

Three sub-codes for the `onEscalate` flow. Only fires when a SUSPICIOUS verdict lands in the escalate band (default 60-84 confidence) and either:
- `_TIMEOUT`, the handler took longer than `escalationTimeout`.
- `_DENIED`, the handler returned `false`.
- `_NO_HANDLER`, no `onEscalate` was configured.

Treat all three as "the action is blocked, log the reason."

### `InsufficientBalanceError`

The Registry's prepaid balance for your wallet is below the protocol fee (0.002 USDC) or the publisher stake (1 USDC), depending on which call triggered it. Call `deposit()` and retry.

### `NetworkError`

Transient infrastructure failures: RPC drop, AXL daemon unreachable, 0G Compute provider 5xx. Retry with exponential backoff (1s, 2s, 4s) capped at three attempts.

### `AntibodyNotFoundError`

`getAntibody()` was called with an id that does not exist in the Registry. Not retryable.

### `DuplicateAntibodyError`

`publish()` was called with a matcher tuple that already exists. The error includes the existing `keccakId` so you can fetch the prior antibody:

```ts
catch (err) {
  if (err instanceof DuplicateAntibodyError) {
    const existing = await immunity.getAntibody(err.existingKeccakId);
    console.log(`already published as ${existing.immId}`);
  }
}
```

Common when seeding from external lists; treat as success.

### `StakeLockedError`

`withdraw()` requested an amount that overlaps locked publisher stake. Wait until `stakeLockUntil` passes, then retry.

### `TeeAttestationError`

The TEE response signature failed verification against the registered TEE signer. Most often caused by provider key rotation. Recreate the `Immunity` instance to pick up the new signer (the SDK calls `acknowledgeProviderSigner()` internally during `start()`).

### `TeeResponseError`

The TEE returned a 200 response but the body did not match the strict JSON schema. The SDK never extracts free text from a malformed response. Log the raw response for triage and degrade to `trust-cache` for the immediate retry.

## Best-practice retry table

| Error code | Retry? | Strategy |
|---|---|---|
| `ERR_NETWORK` | Yes | backoff 1s/2s/4s, max 3 attempts |
| `ERR_TEE_ATTESTATION` | Once | recreate Immunity, retry once, then degrade |
| `ERR_TEE_RESPONSE` | Once | retry once, then degrade |
| `ERR_INSUFFICIENT_BALANCE` | Yes | deposit + retry |
| `ERR_ESCALATION_TIMEOUT` | No | escalation-by-design; log and abort |
| `ERR_BLOCKED` | No | hard block; do not retry |
| `ERR_ANTIBODY_NOT_FOUND` | No | nothing to retry |
| `ERR_DUPLICATE_ANTIBODY` | No | catch, treat as success |
| `ERR_STAKE_LOCKED` | No | wait for unlock |
| `ERR_NOT_STARTED` | Yes | call `start()` first |
| `ERR_MISSING_CONFIG` | No | fix config |

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, all options.
- **[Immunity class](/reference/immunity-class/)**, the methods that throw.
