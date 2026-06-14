---
title: "Errors"
order: 5
description: "Full taxonomy of SDK errors with stable codes for runtime branching."
---

# Errors

Every SDK error extends `ImmunityError` and carries a stable `code` string. Branch on `code`, not on the message text: messages may change between versions, codes do not.

```ts
import { ImmunityError, parseUsdc } from "@immunity-protocol/sdk";

try {
  await immunity.check(tx, ctx);
} catch (err) {
  if (err instanceof ImmunityError) {
    switch (err.code) {
      case "ERR_INSUFFICIENT_BALANCE":
        await immunity.deposit(parseUsdc("1"));
        return retry();
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
| `MissingConfigError` | `ERR_MISSING_CONFIG` | construction missing or malformed `wallet`/`network` | fix config |
| `NotStartedError` | `ERR_NOT_STARTED` | a method called before `start()` | call `start()` first |
| `BlockError` | `ERR_BLOCKED` | hard policy block (rare; ordinary blocks use `result.allowed`) | not retryable |
| `EscalationError` | `ERR_ESCALATION_TIMEOUT` | `onEscalate` exceeded `escalationTimeout` | tune timeout or handler |
| `EscalationError` | `ERR_ESCALATION_DENIED` | operator returned `false` | as designed; not retryable |
| `EscalationError` | `ERR_ESCALATION_NO_HANDLER` | escalate verdict, no handler configured | set `onEscalate` |
| `InsufficientBalanceError` | `ERR_INSUFFICIENT_BALANCE` | prepaid balance below the fee or bond | `deposit()` |
| `NotRegisteredError` | `ERR_NOT_REGISTERED` | `publish()` before `registerPublisher()` | register first |
| `AlreadyRegisteredError` | `ERR_ALREADY_REGISTERED` | `registerPublisher()` when already registered | nothing to do |
| `NetworkError` | `ERR_NETWORK` | RPC, storage gateway, or CRE unreachable | retry with backoff |
| `AntibodyNotFoundError` | `ERR_ANTIBODY_NOT_FOUND` | reading an unknown antibody id | nothing to do |
| `DuplicateAntibodyError` | `ERR_DUPLICATE_ANTIBODY` | matcher already published under this identity | catch and skip |
| `StakeLockedError` | `ERR_STAKE_LOCKED` | withdraw overlapping a locked bond | wait for unlock |
| `TeeAttestationError` | `ERR_TEE_ATTESTATION` | CRE verdict failed attestation verification | retry once, then degrade |
| `TeeResponseError` | `ERR_TEE_RESPONSE` | CRE returned malformed verdict JSON | log and degrade |

## Class details

### `ImmunityError`

The base. `instanceof ImmunityError` matches every SDK error. Carries `code` and `message`.

```ts
class ImmunityError extends Error {
  readonly code: string;
}
```

### `EscalationError`

Carries `kind: "timeout" | "denied" | "no-handler"`. Only fires when a SUSPICIOUS verdict lands in the escalate band. Treat all three as "the action is blocked, log the reason."

### `InsufficientBalanceError`

Carries `required` and `available` (both `bigint`). The prepaid balance cannot cover a settled fee or a publish bond. `deposit()` and retry.

### `DuplicateAntibodyError`

Carries the existing `keccakId`, so you can fetch the prior antibody instead of minting a duplicate. Common when seeding from external lists; treat as success.

### `StakeLockedError`

Carries `unlockAt` (`bigint`, unix seconds). The requested withdrawal overlaps a bond locked while an antibody is enforced. Wait until `unlockAt`.

### `TeeAttestationError` / `TeeResponseError`

Tier-3 failures. `TeeAttestationError` means the returned verdict did not verify against the pinned CRE workflow. `TeeResponseError` means the verdict body did not match the strict schema. The SDK never extracts free text from a malformed verdict. Retry once, then degrade to `trust-cache` for the immediate call.

## Best-practice retry table

| Code | Retry? | Strategy |
|---|---|---|
| `ERR_NETWORK` | yes | backoff 1s/2s/4s, max 3 |
| `ERR_TEE_ATTESTATION` | once | retry once, then degrade |
| `ERR_TEE_RESPONSE` | once | retry once, then degrade |
| `ERR_INSUFFICIENT_BALANCE` | yes | deposit + retry |
| `ERR_NOT_STARTED` | yes | `start()` first |
| `ERR_ESCALATION_*` | no | escalation by design; log and abort |
| `ERR_BLOCKED` | no | hard block |
| `ERR_NOT_REGISTERED` | no | register first |
| `ERR_DUPLICATE_ANTIBODY` | no | treat as success |
| `ERR_STAKE_LOCKED` | no | wait for unlock |
| `ERR_ANTIBODY_NOT_FOUND` | no | nothing to retry |
| `ERR_MISSING_CONFIG` | no | fix config |

## See also

- **[ImmunityConfig](/reference/immunityconfig/)**, all options.
- **[Immunity class](/reference/immunity-class/)**, the methods that throw.
