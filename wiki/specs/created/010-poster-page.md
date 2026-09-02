---
type: Spec
title: 010 — Poster page
description: The anonymous poster views their ad's status and comments, and can delete it.
---

# 010 — Poster page

## Goal

Without any account, the poster keeps control over their ad (P3 flow).

## Scope

* `GET /api/posts/{id}?t={token}` — token verified against `mgmt_token_hash`; returns status + approved comments
* `DELETE /api/posts/{id}?t={token}` — removes the ad (status change → leaves the feed)
* Page `/p/{postId}?t={token}` — status ("wird geprüft" / live / abgelehnt), approved comments, delete button with confirmation

## Acceptance criteria

* Wrong/missing token → 404, no data leaked
* Delete → ad gone from feed within ≤30 s
* Correct token after deletion → sensible "already deleted" state

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [MVP spec — P3 flow](../architecture/mvp-spec.md)
