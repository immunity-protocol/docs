---
title: "The public feed"
order: 6
description: "Read antibodies from RSS, JSON, or webhooks. No SDK install needed for read-only consumers."
---

# The public feed

Every antibody published to the on-chain Registry shows up in three public feeds within seconds:

- **RSS**, [`https://immunity-protocol.com/feed/antibodies.rss`](https://immunity-protocol.com/feed/antibodies.rss)
- **JSON Feed**, [`https://immunity-protocol.com/feed/antibodies.json`](https://immunity-protocol.com/feed/antibodies.json)
- **Webhooks**, register at the docs site (see below).

Read-only consumers (wallet UIs, security researchers, monitoring agents, dashboards) do **not** need the SDK installed. RSS and JSON are static endpoints served from a CDN; webhooks are a small HTTP `POST` from our indexer to your URL.

## When to use each

| Use case | Best feed |
|---|---|
| Wallet UI showing recent flags to users | RSS or JSON Feed (cache 60s) |
| Security research dashboard | JSON Feed (machine-friendly schema) |
| Real-time alerting / Slack bot | Webhook (sub-second delivery) |
| Static SEO-friendly index | RSS (Google Reader-compatible) |
| Cross-protocol indexer (Dune, Etherscan) | Webhook + JSON for backfill |

If your consumer is **not** an agent that calls `check()`, do not install the SDK. The feed is enough.

## RSS

Standard RSS 2.0. Each `<item>` is one antibody:

```xml
<item>
  <title>IMM-2026-0042: Tornado Cash sanctioned router</title>
  <link>https://immunity-protocol.com/antibody/IMM-2026-0042</link>
  <guid isPermaLink="false">0x...keccakId</guid>
  <pubDate>Wed, 30 Apr 2026 14:00:00 GMT</pubDate>
  <category>ADDRESS</category>
  <category>MALICIOUS</category>
  <description>OFAC SDN list. Mixer router used by Lazarus laundering.</description>
</item>
```

Latency: 60 seconds at most (the indexer's batch interval).

## JSON Feed

JSON Feed 1.1 spec. One item per antibody, machine-friendly schema:

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Immunity Protocol antibodies",
  "home_page_url": "https://immunity-protocol.com/antibodies",
  "feed_url": "https://immunity-protocol.com/feed/antibodies.json",
  "items": [
    {
      "id": "0x...keccakId",
      "url": "https://immunity-protocol.com/antibody/IMM-2026-0042",
      "title": "IMM-2026-0042: Tornado Cash sanctioned router",
      "date_published": "2026-04-30T14:00:00Z",
      "tags": ["ADDRESS", "MALICIOUS"],
      "_immunity": {
        "immId": "IMM-2026-0042",
        "immSeq": 42,
        "keccakId": "0x...",
        "abType": "ADDRESS",
        "verdict": "MALICIOUS",
        "confidence": 95,
        "severity": 90,
        "status": "ACTIVE",
        "publisher": "0x...",
        "createdAt": 1714478400,
        "primaryMatcher": { "kind": "address", "chainId": 16602, "target": "0x..." }
      }
    }
  ]
}
```

The `_immunity` namespace carries protocol-specific data not standard to JSON Feed. Stable across feed versions.

## Webhooks

Register at [`https://docs.immunity-protocol.com/feeds/webhooks`](https://docs.immunity-protocol.com/feeds/webhooks). The indexer POSTs to your URL within ~2 seconds of an on-chain mint:

```http
POST /your-webhook-path HTTP/1.1
Host: your-server.example.com
Content-Type: application/json
X-Immunity-Signature: sha256=...
X-Immunity-Event: antibody.minted

{
  "event": "antibody.minted",
  "data": {
    "immId": "IMM-2026-0042",
    "keccakId": "0x...",
    "abType": "ADDRESS",
    "verdict": "MALICIOUS",
    "publisher": "0x...",
    "createdAt": 1714478400,
    "primaryMatcher": { ... }
  }
}
```

The `X-Immunity-Signature` header is `HMAC-SHA256(payload, your_secret)`. Verify it before processing.

Events you can subscribe to:
- `antibody.minted`, new antibody on chain.
- `antibody.matched`, an existing antibody matched a check (with the matched `checkId` and `valueProtectedUsd`).
- `antibody.challenged`, a challenge was filed.
- `antibody.slashed`, a challenge succeeded; antibody slashed.
- `antibody.expired`, antibody expired (v2 only; today no antibodies expire).

## Filtering

Both RSS and JSON Feed support query-string filters:

- `?type=ADDRESS,SEMANTIC`, only certain types.
- `?verdict=MALICIOUS`, only MALICIOUS verdicts (skip SUSPICIOUS).
- `?status=ACTIVE`, only currently-active antibodies (default).
- `?chainId=16602`, only antibodies for a specific chain (ADDRESS antibodies carry their chain).

Combine freely:

```
https://immunity-protocol.com/feed/antibodies.json?type=ADDRESS&verdict=MALICIOUS&chainId=1
```

## Rate limits and caching

- **RSS / JSON Feed**, served from a CDN with a 60s cache. Hitting them every second is fine; CDN absorbs the load.
- **Webhooks**, no rate limit on delivery, but if your endpoint returns 5xx the indexer retries with exponential backoff for ~24 hours then drops.

## Provenance and trust

The feed is a **derivative view**. The on-chain Registry is the canonical source. Anything in the feed is verifiable by reading the Registry directly:

```ts
const antibody = await registry.getAntibody(keccakId);
```

If the feed and the Registry ever disagree, trust the Registry. The feed indexer is best-effort and can lag during chain reorgs (rare on 0G but not impossible).

## See also

- **[Concepts: Antibodies](/concepts/antibodies/)**, the lifecycle of what you're consuming.
- **[Network: Registry on 0G](/network/registry-on-0g/)**, how to verify feed data against the on-chain truth.
