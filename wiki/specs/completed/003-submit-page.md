---
type: Spec
title: 003 — Submit page
description: Mobile-first anonymous ad form at /b/{boardId}/neu with client-side photo resize and management-link confirmation.
---

# 003 — Submit page

## Goal

Scanning the board's QR leads to a phone form that feels no more complex than pinning up a paper note.

## Scope

* `/b/{boardId}/neu` — German UI, mobile-first, vanilla JS
* Fields: category dropdown, title, body, photo toggle (take/upload), contact fields (phone / WhatsApp / email / Instagram / address), duration 1–2 weeks
* Photo: client-side resize to ≤1600 px JPEG (~200–400 KB) via canvas before upload (upload itself in 004)
* Submit → `POST /api/posts` → confirmation: "Vielen Dank! Dein Inserat wird geprüft" + management link as URL **and QR** (bundled QR lib, no service)

## Acceptance criteria

* End-to-end on a phone browser: form → confirmation with working management link
* Photo >1600 px is auto-resized before upload
* No account, no email anywhere in the flow

## Depends on

* [002 — Submit API](002-submit-api.md)

## Related

* [MVP spec — P1 flow](../architecture/mvp-spec.md)
* [Positioning — usability bar](../business/positioning.md)
