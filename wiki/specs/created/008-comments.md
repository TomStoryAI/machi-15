---
type: Spec
title: 008 — Comments API & form
description: POST /api/posts/{id}/comments and the per-frame comment form page.
---

# 008 — Comments API & form

## Goal

A viewer can comment on a live frame by scanning the frame's small QR.

## Scope

* `POST /api/posts/{id}/comments` — body text; post must be live
* Rate limit: 5 comments / 10 min / IP
* Comment row `status: pending` (same moderation queue as posts)
* Comment form page `/b/{boardId}/p/{postId}` — German, mobile-first
* Display renders a small QR per frame linking to the comment form (bundled QR lib)

## Acceptance criteria

* Comment on a live post → `pending`, visible in the admin queue
* Commenting on a pending/expired post → 404

## Depends on

* [006 — Feed API](006-feed-api.md)

## Related

* [MVP spec — P2 flow](../architecture/mvp-spec.md)
