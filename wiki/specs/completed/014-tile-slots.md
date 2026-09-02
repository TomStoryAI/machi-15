---
type: Spec
title: 014 — Tile slots (unique QR per tile)
description: Every QR on the board is unique; scanning tile row R column C lands the post in exactly that tile.
---

# 014 — Tile slots (unique QR per tile)

## Goal

Scanning the QR in a specific tile posts into THAT tile — "when I scan the QR code in the first row at column 7, that is where I want my picture to land" (Tom, 2026-09-02).

## Scope

* Tiles are numbered 1–27 (row-major, 9 per row); tiles 13–15 belong to the sponsor banner and are not addressable
* Each empty tile's QR encodes `/b/{boardId}/neu?slot=N`
* Submit page reads `slot` from the URL and sends it with the post
* Validation: slot optional; when present must be 1–27 excluding 13–15, and not occupied by another pending/live post of the board → German 409 ("Dieses Feld ist leider schon belegt.")
* `posts.slot` column (migration 0006); feed and admin responses include it
* Display: a post with a slot renders in that tile; posts without a slot fill remaining free tiles in feed order (backwards compatible with pre-014 posts)

## Acceptance criteria

* Scan tile row 1 / column 7 (slot 7) → post (with photo) lands in that tile within ≤30 s
* Occupied tile → friendly German rejection
* Sponsor cells (13–15) are not addressable
* Unique QR per tile (two tiles never share the same URL)

## Depends on

* [002 — Submit API](002-submit-api.md)
* [004 — Photo storage & serving](004-photo-storage.md)
* [013 — Display layout per Tom's sample board](013-display-sample-layout.md)

## Related

* [MVP spec — display layout](../architecture/mvp-spec.md)
