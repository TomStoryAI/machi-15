---
type: Spec
title: 002 — Submit API
description: POST /api/posts with validation, rate limiting, and anonymous management token.
---

# 002 — Submit API

## Goal

An anonymous person can create a classified ad via API — it lands as `pending` in D1.

## Scope

* `POST /api/posts` — body: `boardId`, `category`, `title`, `body`, optional `photoKey` (added later by 004), optional contact fields, `durationWeeks` (1|2)
* Validation: title/body required, category from list, friendly German error messages
* Rate limit: max 3 posts/hour/IP (D1-based counter)
* Insert `posts` row with `status: pending`
* Response: `{ postId, mgmtToken }` — token random 128-bit, stored **hashed** in `mgmt_token_hash`

## Acceptance criteria

* Valid post → `pending` row + token returned
* Invalid input → 400 with German message
* 4th post within an hour → 429 with friendly message

## Depends on

* [001 — Repo bootstrap & deploy](001-repo-bootstrap.md)

## Related

* [Data model](../architecture/data-model.md)
* [MVP spec — P1 flow](../architecture/mvp-spec.md)
