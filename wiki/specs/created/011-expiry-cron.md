---
type: Spec
title: 011 — Expiry cron
description: Scheduled Worker expires posts and cleans up photos.
---

# 011 — Expiry cron

## Goal

Posts die after 1–2 weeks and their photos get deleted — keeps the board fresh and R2 free forever.

## Scope

* Scheduled Worker (cron, nightly)
* Posts past `expires_at` → `status: expired`
* Photos of expired posts → deleted after a 30-day grace period
* Logs counts per run

## Acceptance criteria

* Expired post leaves the feed (006 already excludes it)
* Photo removed after grace, not before
* R2 usage stays bounded (see [deployment math](../architecture/deployment.md))

## Depends on

* [004 — Photo storage & serving](004-photo-storage.md)

## Related

* [MVP spec — scope](../architecture/mvp-spec.md)
* [Deployment — zero-cost math](../architecture/deployment.md)
