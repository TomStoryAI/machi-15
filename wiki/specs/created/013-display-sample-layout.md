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
* **QR tiles**: scanning a QR lets passers-by post there → each QR encodes the board's submit URL.
* **Taken tiles**: live posts replace QR tiles (feed order, newest first); a taken tile shows the post and its comment QR.
* MVP = a single market (one board). Multi-board stays in the data model, out of MVP scope.
* Header stays "Machi-Board (Display)" (verify-me wording); polling ≤30 s; offline hint; legal footer.

## Scope (this iteration)

* Rework `public/display.html/js`: 9×3 CSS grid; sponsor banner (static asset, data-driven via `promoter_logo_key` → `/promoter/{key}`) at row 2, columns 4–6; QR tiles fill the remaining cells; live posts replace tiles in feed order.
* Seed `promoter_logo_key = promoter.png` via `scripts/seed-board.mjs --remote`.
* **Not in this iteration** (follow-up if Tom wants it): per-tile slot mapping (scan tile N → post lands in tile N). Today every QR leads to the same submit form and posts fill tiles in order.

## Acceptance criteria

* Tom visually confirms the grid matches the sample: 3 rows × 9 columns, sponsor banner centered in row 2.
* Taken tiles show posts within ≤30 s; empty tiles are scannable QRs.

## Depends on

* [007 — Display page](../completed/007-display-page.md)

## Related

* [MVP spec — display layout](../architecture/mvp-spec.md)
