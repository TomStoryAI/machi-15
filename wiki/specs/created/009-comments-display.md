---
type: Spec
title: 009 — Comments on display
description: Approved comments appear under their frame on the board.
---

# 009 — Comments on display

## Goal

Approved comments are readable under the frame on the 55" screen.

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
