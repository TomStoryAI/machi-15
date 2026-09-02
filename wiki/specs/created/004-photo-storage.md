---
type: Spec
title: 004 — Photo storage & serving
description: R2 upload for ad photos and auth-gated serving — pending photos stay private.
---

# 004 — Photo storage & serving

## Goal

Photos land in R2 and are only publicly visible once the ad is live.

## Scope

* Photo upload endpoint (multipart) → R2 with unguessable key (UUID)
* `photo_key` written to the post row
* `GET /api/photos/{key}` serves the photo only when:
  * the post is `live` (public), OR
  * requester is the admin (session), OR
  * requester holds the poster's management token
* Correct `Content-Type`; raw upload size capped

## Acceptance criteria

* Pending post's photo → 404 for public, visible to admin and poster
* Live post's photo → publicly served
* Key guessing is impractical (UUID)

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [Components — storage](../architecture/components.md)
* [MVP spec — security](../architecture/mvp-spec.md)
