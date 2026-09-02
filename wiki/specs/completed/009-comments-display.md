---
type: Spec
title: 009 — Comments on display
description: Approved comments appear under their frame on the board.
---

# 009 — Comments on display

> **Superseded (Tom, 2026-09-02):** comments are PRIVATE between commenter and poster. The public board never shows comments — not the bodies, not a count. The poster sees approved comments only on their management page (`/p/{postId}?t={token}`). Comments were removed from the display and from the public feed entirely.

## Goal

~~Approved comments are readable under the frame on the 55" screen.~~ (Superseded — see note above.)

## Scope

* Feed includes approved comments (from 006)
* Frame renders the latest N approved comments under the ad (no interaction — TV has no clicks)
* Comments appear/disappear within the normal ≤30 s poll cycle

## Acceptance criteria

* Approve a comment in admin → visible under its frame ≤30 s later
* Rejected comments never appear

## Depends on

* [007 — Display page](007-display-page.md)
* [008 — Comments API & form](008-comments.md)

## Related

* [MVP spec — P2 flow](../architecture/mvp-spec.md)
