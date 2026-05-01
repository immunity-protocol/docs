---
title: "The public feed"
order: 2
description: "Protocol-level view of the public feeds. Where they come from, what they guarantee, how to host your own."
---

# The public feed

The public feed is the network's broadcast layer to the rest of the world. Every published antibody, every challenge, every match shows up in feeds within seconds. The feeds are derivative views of the on-chain Registry; the Registry is the source of truth.

For the developer-facing how-to (RSS schema, JSON Feed format, webhook delivery), see [Guides: the public feed](/guides/the-public-feed/). This page is the protocol-level explanation.

## What gets indexed

Every Registry event:

| Event | Indexed | Triggers feed item |
|---|---|---|
| `AntibodyMinted` | yes | new feed entry |
| `AntibodyMatched` | yes | match event with `valueProtectedUsd` |
| `AntibodyChallenged` | yes | status change in feed |
| `AntibodySlashed` | yes | status change in feed |
| `AntibodyExpired` | reserved (v2) | n/a |
| `CheckSettled` (per-check telemetry) | yes (aggregated) | feeds the dashboard, not the antibody feed |
| `PublisherStakeWithdrawn` | yes | publisher dashboard updates |

The indexer subscribes to the Registry's full event stream and writes each event to a Postgres table. Three derived views are emitted from those tables:

- **RSS**, antibody-mint events, ordered by `createdAt` desc, filterable by query string.
- **JSON Feed**, the same data, JSON Feed 1.1 format, more machine-friendly.
- **Webhooks**, every event pushed to subscribed endpoints in near real time.

## Guarantees

### What the feed guarantees

- **Eventual consistency with the Registry.** Every event in the Registry will appear in the feeds within ~60 seconds (RSS / JSON, batch interval) or ~2 seconds (webhooks).
- **Idempotent delivery.** Webhook payloads carry a stable `event_id`; deduplicate on your side.
- **HMAC signature.** Webhook deliveries include `X-Immunity-Signature: sha256=...` over the raw body.
- **Schema stability.** The `_immunity` namespace inside JSON Feed items is versioned; breaking changes get a major bump.

### What the feed does NOT guarantee

- **Cryptographic equivalence with the Registry.** The feed is a derivative; cross-reference with `getAntibody(keccakId)` for trust-critical decisions.
- **Order across types.** RSS items are ordered by `createdAt`; webhooks are ordered by event id within a single subscription. Cross-event ordering across types is best-effort.
- **Historical replay.** Feeds carry the most recent N items by default. Full history requires reading the Registry directly or using the REST API at `https://api.immunity-protocol.com/antibodies?since=...`.

## Trust model

The feed is operated by the Ophelios indexer cluster. The signature on webhook deliveries proves the indexer signed the payload, **not** that the underlying data is correct. To verify the data:

1. Take the `keccakId` from the feed item.
2. Call `Registry.getAntibody(keccakId)` from your own RPC.
3. Compare the `verdict`, `confidence`, `publisher`, and `createdAt` fields.

If they do not match, trust the Registry. The feed is a convenience layer.

## Hosting your own indexer

The indexer source is open at [github.com/immunity-protocol/immunity-app](https://github.com/immunity-protocol/immunity-app). Run it yourself if you need:

- **Stricter consistency** than 60s for RSS / 2s for webhooks.
- **Custom event filters** (e.g., only ADDRESS antibodies for a single chain).
- **Sovereign infrastructure** (you do not want to depend on Ophelios's uptime).

The indexer is a Zephyrus PHP app reading from 0G Chain via JSON-RPC, writing to Postgres, exposing the same RSS / JSON Feed / webhook interface. Deploy it anywhere that can run PHP 8.4 + Postgres.

## Future enhancements

Roadmapped (not shipped):

- **Replicas across multiple operators** for trust-minimized indexing.
- **Optimistic challenge feed** for v2 dispute resolution.
- **Per-publisher stream subscriptions** for security-team workflows.
- **GraphQL endpoint** for ad-hoc queries.

## See also

- **[Guides: the public feed](/guides/the-public-feed/)**, developer-facing how-to.
- **[Network: Registry on 0G](/network/registry-on-0g/)**, the canonical source of truth.
