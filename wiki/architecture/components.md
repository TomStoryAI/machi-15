---
type: Concept
title: Components
description: The four frontends, the Worker API, storage, and QR handling — design part 1.
status: draft
---

# Components

## Frontends (Cloudflare Pages)

| Page | Path | Purpose |
|---|---|---|
| TV display | `/b/{boardId}` | header "Machi-Board (Display)", grid of live frames, big "Starte hier Dein kostenloses Inserat!" QR tile, promoter tile bottom-right (see [MVP spec](mvp-spec.md)); polls feed every 20–30 s; vanilla HTML/CSS/JS; optimized for 55" at a few meters' viewing distance |
| Submit | `/b/{boardId}/neu` | anonymous ad form: text-only/photo toggle, Textform 1 + 2, category, duration 1–2 weeks, contact fields; client-side photo resize to ≤1600 px JPEG (~200–400 KB) before upload |
| Poster page | `/p/{postId}?t={token}` | poster views comments on their ad, deletes their ad (P3 flow) |
| Admin | `/admin/{boardId}` | password-protected; approve/reject queue for posts AND comments; view live; delete |

## Workers API

Submit post, board feed, add comment, admin login + approve/reject/delete, authed photo serving, scheduled post-expiry job (cron).

## Storage

* **D1**: `boards`, `posts`, `comments` (see [data model](data-model.md))
* **R2**: photos only. Photos of pending posts are **private** — served only to admin/poster via authed routes, never publicly before approval.

## QR codes

Plain URLs (`machi15.com/b/{boardId}/neu`), one per board, generated once — no QR service or API dependency.

## Multi-board

Every URL carries a `boardId`; the MVP runs one board, a second board is just a new `boards` row. Machi-Point push is NOT in the MVP (YAGNI).

## Related

* [MVP spec](mvp-spec.md)
* [Deployment](deployment.md)
* [Data model](data-model.md)
* [Open questions](open-questions.md)
