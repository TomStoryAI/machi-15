---
type: Spec
title: MVP specification
description: The implementation contract for the machi-15 MVP — scope, tech stack, display layout, pages, API, data, flows, error handling, testing.
status: draft
---

# MVP specification

This page is the **overview contract**. Implementation proceeds as small numbered specs in [wiki/specs/](../specs/index.md) — built in number order, each flipped from `created` to `completed` when done. Status: awaiting Tom's review (2026-09-02).

## Scope

### In MVP

* One board per deployment; multi-board-ready via `boardId` (a second board = one new `boards` row)
* Anonymous posting: text-only or with photo, category, 1–2 weeks duration, contact fields
* Moderation of posts AND comments (admin approval queue, nothing public before approval)
* Four frontends: TV display, submit form, poster management page, admin page
* Promoter/sponsor tile on the display (per-board config)
* Scheduled expiry: posts auto-expire after 1–2 weeks; photos deleted after a grace period

### NOT in MVP

* Machi-Point pushes, Super-/Mega-Frames, Tageskarte, Machi-Verse booking
* Poster accounts, email notifications, payments
* AI moderation, 15-minute-city research features

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Plain HTML + CSS + vanilla JavaScript, no framework, no build step (TV browser safety). Mobile-first submit page. One locally bundled QR library (~20 KB) for per-frame comment QRs and the poster's management-link QR |
| Backend | Cloudflare Workers, TypeScript, [Hono](https://hono.dev) router (~13 KB, Workers-first) |
| Database | Cloudflare D1 (SQLite at the edge), schema via D1 migrations |
| Photos | Cloudflare R2 (S3-compatible), Worker bindings; client-side resize to ≤1600 px JPEG (~200–400 KB) before upload |
| Auth | WebCrypto PBKDF2 hash for admin password; random management tokens stored hashed |
| QR codes | Plain URLs, one per board; no QR service |
| Dev | `wrangler dev` (local Workers + D1 + R2 simulation), `wrangler deploy` |
| Tests | Vitest (unit) + browser E2E through `wrangler dev` |

## Display layout (Tom's sample board, 2026-09-02)

* Header: **"Machi-Board (Display)"** — exact wording to verify with Tom
* **Board grid: 3 rows × 9 columns of tiles** (Tom, 2026-09-02): row 1 = 9 QR codes; row 2 = 3 QRs | sponsor banner (spans the middle 3 columns) | 3 QRs; row 3 = 9 QR codes. See spec 013.
* **Sponsor banner in the middle**: Tom's image (`public/promoter/promoter.png`, source: gstatic URL in spec 013) + name REWE FAMILIE SCHULZE / slogan "Mehr Nähe geht nicht." (wording to verify)
* **QR tiles**: every empty tile is a QR → `/b/{boardId}/neu` (scan → post there)
* **Taken tiles**: live posts replace QR tiles in feed order (newest first); taken tiles show title/body/photo/contacts/comment count + their comment QR
* Polls the feed every 20–30 s; works offline-ish (last feed cached, subtle offline hint)
* 55" legibility: large type, high contrast, readable from a few meters
* **MVP = a single market (one board)** — Tom's decision 2026-09-02; multi-board stays in the data model, out of MVP scope
* Follow-up candidate: per-tile slots (scan tile N → post lands in tile N) — today every QR leads to the same submit form

## Pages

| Page | Path | Notes |
|---|---|---|
| TV display | `/b/{boardId}` | layout above; vanilla JS polling |
| Submit | `/b/{boardId}/neu` | category, title + body, photo toggle (take/upload → resize), contact fields, 1/2-week duration; confirmation screen with management link + QR |
| Poster page | `/p/{postId}?t={token}` | status, approved comments, delete button |
| Comment | `/b/{boardId}/p/{postId}` | comment form for one live frame (opened via the frame's QR) |
| Admin | `/admin/{boardId}` | password login; pending queue (posts + comments) with approve/reject; live posts with delete |

## API (Worker)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/posts` | create ad — validate, size checks, per-IP rate limit, store photo in R2 |
| GET | `/api/boards/{id}/feed` | live posts + approved comments (display) |
| POST | `/api/posts/{id}/comments` | add comment (rate-limited, pending) |
| GET | `/api/posts/{id}?t={token}` | poster view (status + comments) |
| DELETE | `/api/posts/{id}?t={token}` | poster deletes own ad |
| POST | `/api/admin/{boardId}/login` | password → session token |
| GET | `/api/admin/{boardId}/pending` | pending posts + comments |
| POST | `/api/admin/{boardId}/posts/{id}/approve` / `.../reject` | moderation |
| POST | `/api/admin/{boardId}/comments/{id}/approve` / `.../reject` | moderation |
| DELETE | `/api/admin/{boardId}/posts/{id}` | admin removal |
| GET | `/api/photos/{key}` | photo serving — public only when post is live; otherwise admin/poster auth |
| cron | (scheduled) | expire posts; delete photos after grace period |

## Data model

See [data-model.md](data-model.md). `boards` carries promoter fields (`promoter_name?`, `promoter_logo_key?`, `promoter_slogan?`).

## Flows

### P1 — Inserieren (happy path)

1. Poster scans the on-screen QR → submit page
2. Fills form; photo (if any) resized client-side
3. `POST /api/posts` → D1 row `pending` + photo private in R2
4. Confirmation: "Vielen Dank! Dein Inserat wird geprüft" + management link (URL + QR to save/screenshot)
5. Admin approves → `live`
6. Display picks it up within ≤30 s
7. Expires after 1–2 weeks → cron archives, photo deleted after grace

### P2 — Kommentieren

1. Viewer scans the small QR on a live frame → comment form for that post
2. Comment lands `pending` in the same moderation queue
3. Approved → appears under the frame within ≤30 s

### P3 — Poster sichtet Kommentare / löscht

1. Poster opens their saved management link
2. Sees status + approved comments
3. Delete → ad disappears from the display within ≤30 s

### Moderation

Admin checks `/admin/{boardId}` on their phone a few times a day. No notifications in MVP (email digest later via Resend free tier).

## Error handling

* Display offline: last feed cached in localStorage, subtle offline hint, auto-retry
* Submit: German validation errors; raw photo size capped; per-IP rate limit (~3 posts/hour) with a friendly message; retry on network failure
* Admin: generic error on wrong password; session expiry → re-prompt
* TV quirks: polling (no websockets), no autoplay, works on old TV browsers

## Security

* Admin password hashed (PBKDF2 via WebCrypto); management tokens random 128-bit, stored hashed
* R2 photo keys unguessable; pending photos served only with admin/poster auth
* Input sanitization on all text fields; rate limits per IP

## Testing

* **Unit (Vitest)**: validation, expiry cron, rate limiting, token hashing
* **Integration (wrangler dev + local D1/R2)**: P1 → P2 → P3 end-to-end in a real browser
* **Manual**: real QR scan from a phone; legibility check on an actual 55" TV (font size, contrast, distance)
* **Smoke after deploy**: submit a test ad → approve → verify it appears on the display URL

## Verify-me items (OCR of Tom's mockup screenshot, 2026-09-02)

1. Exact header wording: "Machi-Board (Display" + what follows?
2. Promoter slogan: "Mehr Nähe geht nicht." (OCR read "Mew Nähe geht nicht.")
3. Promoter tile: position/size on the 55" layout
4. Is there a QR tile in the mockup the OCR couldn't see (graphics don't OCR)?

## Open questions

See [open-questions.md](open-questions.md) — categories list, admin notification (default chosen above), moderation SLA, Impressum identity. None block implementation.

## Related

* [Components](components.md)
* [Data model](data-model.md)
* [Deployment](deployment.md)
* [Hard constraints](constraints.md)
* [Open questions](open-questions.md)
