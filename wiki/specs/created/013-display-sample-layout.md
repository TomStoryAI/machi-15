---
type: Spec
title: 013 — Display layout per Tom's sample board
description: 9x3 QR tile grid with the sponsor banner in the middle of the middle row — matches Tom's sample board exactly.
---

# 013 — Display layout per Tom's sample board

## Goal

The 55" display looks like Tom's sample board: a 9-column × 3-row grid of tiles. Empty tiles are QR codes (scan → post there); taken tiles show the post; the sponsor banner sits in the middle of the middle row.

## Requirements (from Tom, 2026-09-02)

* **Grid: 3 rows × 9 columns of tiles.**
  * Row 1: 9 QR codes (full row).
  * Row 2: 3 QR codes | sponsor banner | 3 QR codes (banner spans the 3 middle columns).
  * Row 3: 9 QR codes.
* **Sponsor banner in the middle**: the image Tom provided — `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKkri_9rIga056MZrUQdYS9P_XKCM9YWNmyIaBsBVmQKFd0wEnlqgGyzg&s=10` (fetched into `public/promoter/`; if the gstatic thumbnail is too small, Tom supplies the original file).
* **QR tiles**: every tile has a UNIQUE QR (slot N → `/b/{boardId}/neu?slot=N`); scanning it posts into that tile (see [014](014-tile-slots.md)).
* **Taken tiles**: live posts render in their tile; a taken tile shows the post (incl. photo), its comments, and a comment QR.
* MVP = a single market (one board). Multi-board stays in the data model, out of MVP scope.
* Header stays "Machi-Board (Display)" (verify-me wording); polling ≤30 s; offline hint; legal footer.

## Scope (this iteration)

* Rework `public/display.html/js`: 9×3 CSS grid; sponsor banner (static asset, data-driven via `promoter_logo_key` → `/promoter/{key}`) at row 2, columns 4–6; QR tiles fill the remaining cells (unique slot URLs); live posts render in their tiles.

## Acceptance criteria

* Tom visually confirms the grid matches the sample: 3 rows × 9 columns, sponsor banner centered in row 2.
* Taken tiles show posts within ≤30 s; empty tiles are scannable QRs.

## Depends on

* [007 — Display page](../completed/007-display-page.md)

## Related

* [MVP spec — display layout](../architecture/mvp-spec.md)
