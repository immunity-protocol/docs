---
title: "Operator in the loop"
order: 3
description: "Wire an onEscalate handler so SUSPICIOUS verdicts pause for a human (or a higher-level agent) before auto-blocking."
---

# Operator in the loop

Some threats are obvious (a known drainer, a sanctioned address) and the SDK should block instantly. Some are ambiguous (a counterparty with light bad-faith signals, a SEMANTIC marker with mid-range confidence). For ambiguous cases, you want a human or a higher-level policy agent to make the call.

The `onEscalate` handler is the hook that turns a SUSPICIOUS verdict into a synchronous "ask the operator" callback.

## When it fires

Two conditions must be true:

1. A check has matched antibodies, OR the TEE returned a verdict.
2. The maximum confidence falls in the **escalate band** (default: `60 <= confidence < 85`).

In that window, the SDK invokes your `onEscalate` handler instead of auto-deciding. Outside the window, decisions are deterministic: confidence `>= 85` blocks, confidence `< 60` allows.

Both thresholds are configurable via `confidenceThresholds`.

## The handler signature

```ts
onEscalate?: (ctx: {
  reason: string;                                       // human-readable reason
  confidence: number;                                   // 0..100
  matched: { keccakId: string; immId: string }[];       // antibody refs
}) => Promise<boolean>;                                  // true = allow, false = block
```

Return `true` to allow the action through. Return `false` to block. Throwing is treated as block.

## Common handler patterns

### Slack ping with two buttons

```ts
const immunity = new Immunity({
  wallet,
  axlUrl,
  onEscalate: async ({ reason, confidence, matched }) => {
    const ts = await postSlackMessage({
      channel: "#agent-escalations",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*Escalation* (${confidence}% confident)` } },
        { type: "section", text: { type: "mrkdwn", text: reason } },
        { type: "section", text: { type: "mrkdwn", text: `Matched: ${matched.map(m => m.immId).join(", ")}` } },
        {
          type: "actions",
          elements: [
            { type: "button", action_id: "allow", text: { type: "plain_text", text: "Allow" } },
            { type: "button", action_id: "block", text: { type: "plain_text", text: "Block" }, style: "danger" },
          ],
        },
      ],
    });
    return waitForButtonClick(ts);  // resolves true on Allow, false on Block
  },
  escalationTimeout: 300,            // 5 minutes
  onTimeout: "deny",                 // default-deny if no one clicks
});
```

### Higher-level policy agent

```ts
onEscalate: async ({ reason, confidence, matched }) => {
  const verdict = await policyAgent.classify({
    reason,
    confidence,
    matched,
    contextWindow: getRecentContext(),
  });
  return verdict === "allow";
},
```

The policy agent can be another LLM, a rules engine, or an organization-specific SOC tool. The handler is just a function that returns a boolean.

### Auto-deny with a notification

```ts
onEscalate: async ({ reason, confidence, matched }) => {
  await pageOnCall({ severity: "info", reason, matched });
  return false;     // block, but tell someone
},
```

Useful for low-risk-tolerance agents that should never proceed on a SUSPICIOUS verdict but you still want telemetry.

## Timeout behavior

`escalationTimeout` (default 300 seconds) caps how long the SDK waits for your handler. On timeout, `onTimeout` decides:

- `"deny"` (default), block the action. Safe default.
- `"allow"`, allow the action. Only sensible when the agent is high-traffic and dropping ambiguous calls is worse than letting them through.

The handler itself is not killed on timeout; it keeps running in the background. The SDK just stops waiting for it.

## Errors

| Error | Code | Meaning |
|---|---|---|
| `EscalationError` | `ERR_ESCALATION_TIMEOUT` | handler did not resolve within `escalationTimeout` |
| `EscalationError` | `ERR_ESCALATION_DENIED` | handler returned false |
| `EscalationError` | `ERR_ESCALATION_NO_HANDLER` | escalate verdict but no handler configured |

`ERR_ESCALATION_NO_HANDLER` is a config bug. If you set `confidenceThresholds.escalate`, you must also set `onEscalate`.

## What you DO have access to

Inside the handler, the second arg of `check()` (the `CheckContext`) is **not** passed through. Reason: the operator should make a decision based on the SDK's distilled signal (`reason`, `confidence`, `matched`), not the raw conversation. If you need richer context, capture it in your handler's closure when you call `check()`.

Pattern:

```ts
async function safeSend(tx, ctx) {
  // Capture the context up here.
  const captured = { tx, ctx, agentId: process.env.AGENT_ID };
  // The SDK's onEscalate will close over `captured`.
  const result = await immunity.check(tx, ctx);
  // ...
}

// Configure the SDK once, share captured via a queue keyed by check id.
```

## See also

- **[Reference: ImmunityConfig](/reference/immunityconfig/)**, all config fields.
- **[Reference: Errors](/reference/errors/)**, the full taxonomy.
- **[Concepts: TEE verification](/concepts/tee-verification/)**, where SUSPICIOUS verdicts come from.
