---
type: Spec
title: 007 — Display page
description: The 55" board view — header, frames grid, big QR tile, promoter tile, polling.
---

# 007 — Display page

## Goal

A 55" Google-TV screen shows the schwarzes Brett, readable from a few meters away.

## Scope

* `/b/{boardId}` — vanilla HTML/CSS/JS, no framework, no build step
* Header: "Machi-Board (Display …)" (exact wording — verify-me item)
* Frames grid: title, body, photo, contact details, comment count
* Big QR tile: "Starte hier Dein kostenloses Inserat!" → `/b/{boardId}/neu`
* Promoter tile bottom-right: logo, name, slogan from board config (mockup: REWE / FAMILIE SCHULZE / "Mehr Nähe geht nicht.")
* Polls `/api/boards/{id}/feed` every 20–30 s
* localStorage cache of last feed + subtle offline hint; auto-retry
* 55" CSS: large type, high contrast, no autoplay, no websockets

## Acceptance criteria

* Renders on desktop Chrome AND a Google TV browser
* New live post appears within ≤30 s without manual reload
* Offline: last feed stays visible with a hint

## Depends on

* [006 — Feed API](006-feed-api.md)

## Related

* [MVP spec — display layout](../architecture/mvp-spec.md)
* [Hard constraints — TV browser](../architecture/constraints.md)
