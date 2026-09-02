---
type: Spec
title: 006 — Feed API
description: GET /api/boards/{id}/feed — board config + live posts with approved comments.
---

# 006 — Feed API

## Goal

The display gets everything it needs in one JSON call.

## Scope

* `GET /api/boards/{id}/feed` → board config (`name`, promoter fields) + live posts (newest first) each with approved comments

## Acceptance criteria

* Only `live`, non-expired posts are included
* Expired/rejected/pending posts never appear
* Response is small enough to poll every 20–30 s

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [MVP spec — API table](../architecture/mvp-spec.md)
