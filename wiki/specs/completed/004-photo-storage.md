---
type: Spec
title: 004 — Photo storage & serving
description: Photo upload for ad photos and auth-gated serving — pending photos stay private. D1 blob interim, R2-ready.
---

# 004 — Photo storage & serving

## Goal

Photos land in storage and are only publicly visible once the ad is live.

## Scope

* Photo upload endpoint (multipart) with an unguessable key (UUID) — poster-authed via management token
* `photo_key` written to the post row
* `GET /api/photos/{key}` serves the photo only when:
  * the post is `live` (and non-expired) — public, OR
  * requester is the admin (session), OR
  * requester holds the poster's management token (`?t=`)
* Correct `Content-Type`; raw upload size capped (4 MB)

## Storage: D1 interim, R2-ready (2026-09-02)

* **Interim (active now):** photos stored base64 in a D1 `photos` table (migration 0005). Zero cost, within the 5 GB D1 free tier. Chosen because R2 activation on the account still fails with API 10042 — Cloudflare's enable-R2 flow requires a payment method on file to complete (Tom clicked enable; the API still reports not enabled).
* **End state:** R2 bucket `machi15-photos` (10 GB free). The store is a switch: when the `PHOTOS` binding exists in `wrangler.toml`, uploads/serves use R2; otherwise D1. Migration of existing photos to R2: future follow-up (copy rows → bucket, flip binding).

## Acceptance criteria

* Pending post's photo → 404 for public, visible to admin and poster
* Live post's photo → publicly served
* Key guessing is impractical (UUID)
* Photo appears in admin preview, poster flow, and on the display tile

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [Components — storage](../architecture/components.md)
* [MVP spec — security](../architecture/mvp-spec.md)
* [014 — Tile slots](014-tile-slots.md)
