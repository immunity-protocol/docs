---
title: "CheckResult"
order: 3
description: "Every field on the object returned by immunity.check(). What populates each field at each tier."
---

# `CheckResult`

What `immunity.check()` returns. The shape:

```ts
interface CheckResult {
  allowed: boolean;
  decision: "allow" | "block" | "escalate";
  source: "cache" | "registry" | "tee" | "policy";
  confidence: number;
  antibodies: Antibody[];
  reason: string;
  checkId: Hex32 | null;
  novel: boolean;
  txFacts: TxFacts;
}
```

## Fields

### `allowed`

Type: `boolean`.

The only field your control flow needs. `true`, the agent should proceed. `false`, the agent should not.

Branches like `if (!result.allowed) return;` are the canonical pattern.

### `decision`

Type: `"allow" | "block" | "escalate"`.

The semantic decision. Mapped from the verdict-driven control flow:

- `"allow"`, no matched antibody met the block threshold, and (in `verify` mode) the TEE returned an allow verdict.
- `"block"`, at least one matched antibody hit the block threshold, OR the TEE returned a block verdict.
- `"escalate"`, a SUSPICIOUS verdict landed in the escalate band, the `onEscalate` handler was invoked, and either returned `false` or timed out with `onTimeout: "deny"`.

`allowed === (decision === "allow")` is invariant.

### `source`

Type: `"cache" | "registry" | "tee" | "policy"`.

Which tier resolved the check. See [Three-tier lookup](/concepts/three-tier-lookup/) for the full semantics.

| `source` | Tier | Meaning |
|---|---|---|
| `"cache"` | Tier 1 | matched in local in-memory cache |
| `"registry"` | Tier 2 | cache miss + on-chain matcher hit |
| `"tee"` | Tier 3 | cache + chain miss, TEE inference fired |
| `"policy"` | none | no tier matched, `trust-cache` or `deny-novel` decided |

### `confidence`

Type: `number`, range 0..100.

Highest confidence among matched antibodies, or the TEE-returned confidence if Tier 3 fired. Drives the `decision` mapping via `confidenceThresholds`.

For `source: "policy"` results, `confidence` is 0.

### `antibodies`

Type: `Antibody[]`.

Matched antibodies. Multiple matches are possible (e.g., one ADDRESS + one CALL_PATTERN both fire on the same tx). Empty for `decision: "allow"`.

The first element is the **primary** match (highest severity, then highest confidence as tiebreak). Most agents only need `result.antibodies[0]`.

See [Antibody](/reference/antibody/) for the per-antibody shape.

### `reason`

Type: `string`.

Human-readable summary. Formats vary by source:

- `"cache"` / `"registry"`, joined description from the matched antibodies.
- `"tee"`, the TEE-returned reasoning string (kept under 200 chars).
- `"policy"`, a static string explaining the policy choice.

**Do not branch on this field.** Branch on `allowed`, `decision`, or `source`. `reason` is for logs and operator UI.

### `checkId`

Type: `Hex32 | null`.

The on-chain settlement transaction hash. The Registry's `CheckSettled` event log carries the canonical record.

`null` when:

- `source: "policy"` shortcircuit (the SDK skipped settlement entirely).
- TEE inference failed and the SDK degraded to policy.
- `deny-novel` blocks where no candidate matcher was constructible.

`null` is **not** a bug. It signals "we did not need the chain to make this decision."

### `novel`

Type: `boolean`.

`true` only when:
- `decision: "allow"`, AND
- `source: "policy"`, AND
- `novelThreatPolicy: "trust-cache"` decided.

In other words, "the network has not seen this before, but we let it through anyway because the configured policy says so." Useful for downstream agents that want to flag novel-but-allowed actions for batch review.

### `txFacts`

Type: `TxFacts`.

The SDK's extracted view of the proposed tx that got submitted to the chain via `Registry.check()` for indexing:

```ts
interface TxFacts {
  tokenAddress: Hex32;     // 0x0...0 if no token detected
  tokenAmount: bigint;     // 0 if no amount
  originChainId: bigint;   // 0 if not derivable
}
```

All-zero is a legitimate state (e.g., a non-EVM action with `tx: null`). The indexer uses `txFacts` for the value-protected math; missing facts mean the indexer cannot price the action.

## Example uses

### Audit logging

```ts
log.info({
  decision: result.decision,
  source: result.source,
  confidence: result.confidence,
  immId: result.antibodies[0]?.immId,
  checkId: result.checkId,
  novel: result.novel,
}, "immunity.check");
```

### Operator notification

```ts
if (!result.allowed) {
  notifySlack({
    title: `Blocked: ${result.antibodies[0]?.immId ?? "unknown"}`,
    color: "danger",
    fields: [
      { title: "Decision", value: result.decision },
      { title: "Source", value: result.source },
      { title: "Reason", value: result.reason },
    ],
  });
}
```

### Treating "novel" specially

```ts
if (result.allowed && result.novel) {
  await batchReviewQueue.enqueue({ tx, txFacts: result.txFacts });
}
```

## See also

- **[Immunity class](/reference/immunity-class/)**, the methods that produce this result.
- **[Antibody](/reference/antibody/)**, the shape of items in `result.antibodies`.
- **[Three-tier lookup](/concepts/three-tier-lookup/)**, the `source` field demystified.
