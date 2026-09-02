---
type: Constraint
title: Hard constraints
description: Non-negotiable requirements every design and implementation must respect.
status: stable
---

# Hard constraints

1. **Zero cost** — must run on Cloudflare's free tier (Pages, Workers 100k req/day, D1 5GB, R2 10GB). Math: [deployment](deployment.md).
2. **Anonymous users** — no accounts, no email. Posters get a management-token URL to view comments / delete their ad.
3. **TV browser compatibility** — display page is vanilla HTML/CSS/JS, no frameworks, no build step on the display path.
4. **Moderation required** — nothing is publicly visible before admin approval (posts AND comments).
5. **German UI** — target users are local pedestrians.
6. **Usability bar** — posting must feel no more complex than writing a note and pinning it up (see [positioning](/wiki/business/positioning.md)).
7. **Scale** — ~50–200 uploads/day, always-on public installation.
8. **Display hardware** — 55" Google TV, browser-based; later projectors for shop windows.

## Context from user answers (2026-09-02)

* Always-on public installation
* Scale: ~50–200 uploads/day
* Display device: smart TV browser (Google TV)
* Moderation: admin approves before anything goes live
* One QR code shown on the screen
