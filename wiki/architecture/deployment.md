---
type: Decision
title: Deployment
description: Cloudflare free-tier stack — the decision, rejected alternatives, and zero-cost math.
status: stable
---

# Deployment

## Decision

**Cloudflare stack, free plan**: one Worker (JSON API + static frontends via assets binding) + D1 (SQLite) + R2 (photos). Domain machi15.com moves to Cloudflare DNS. No credit card needed at signup. (2026-09-02: the separate Pages project was replaced by Worker static assets — one deploy target, one domain, no CORS.)

Repo: `github.com/TomStoryAI/machi-15` (local clone `E:\Programmieren\machi-15`). Dev: `wrangler dev` (simulates Workers + D1 + R2 locally). Deploy: `wrangler deploy`; Pages connected to GitHub `main`.

## Rejected alternatives

| Option | Why rejected |
|---|---|
| Supabase + Vercel/Netlify | 1 GB free storage fills within days at 50–200 photos/day; needs external storage anyway → two vendors, no advantage |
| Self-hosted Pi/laptop + PocketBase + Cloudflare Tunnel | forever-€0, but home power/internet uptime fragility for a public installation |

## Zero-cost math (Cloudflare free tier)

| Resource | Free tier | Estimated usage | Verdict |
|---|---|---|---|
| Worker static assets | included in the 100k req/day free tier | display + forms ≈ 2–3k/day | OK |
| Workers | 100k requests/day | ~5k/day (display poll 2.9k + uploads/comments/admin) | ~5% used |
| D1 | 5 GB, 5M rows-read/day | small tables | OK |
| R2 | 10 GB, no egress fees | 200 photos/day × ~300 KB ≈ 60 MB/day | free tier lasts ~5.5 months |
| DNS | free | machi15.com | OK |

## Cost after the free tier

* R2: $0.015/GB/month after 10 GB — at ~60 MB/day growth that is cents per month; expiring old posts (scheduled job) keeps it free indefinitely.
* Workers: $5/month only above 100k requests/day — far away at this scale.

## Related

* [Components](components.md)
* [Hard constraints](constraints.md)
