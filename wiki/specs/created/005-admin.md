---
type: Spec
title: 005 — Admin API & page
description: Password-protected moderation: approve/reject posts and comments, delete live posts.
---

# 005 — Admin API & page

## Goal

The promoter moderates everything on their phone before it goes public.

## Scope

* `POST /api/admin/{boardId}/login` — password check (PBKDF2 hash from `boards.admin_password_hash`) → session token
* `GET /api/admin/{boardId}/pending` — pending posts + comments
* `POST /api/admin/{boardId}/posts/{id}/approve` / `.../reject`
* `POST /api/admin/{boardId}/comments/{id}/approve` / `.../reject`
* `DELETE /api/admin/{boardId}/posts/{id}`
* Admin page `/admin/{boardId}` — phone-friendly queue UI (photo preview, text, contact), approve/reject buttons, live list with delete

## Acceptance criteria

* Wrong password → generic error; correct → queue visible
* Approve → post `live`; reject → `rejected`; neither shows publicly
* Usable on a phone

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [MVP spec — moderation flow](../architecture/mvp-spec.md)
* [Hard constraints — moderation](../architecture/constraints.md)
