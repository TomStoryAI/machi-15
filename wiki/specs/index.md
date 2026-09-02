# Specs

Build in **number order**. **State = folder**: a spec lives in `created/` until it is implemented AND verified, then its file moves to `completed/` and a `wiki/log.md` entry is added.

## Created (build queue)

| # | Spec | Depends on |
|---|---|---|
| 011 | [Expiry cron](created/011-expiry-cron.md) | 004 |
| 013 | [Display layout per Tom's sample board](created/013-display-sample-layout.md) — awaiting Tom's visual confirmation | 007 |
| 014 | [Tile slots — unique QR per tile](created/014-tile-slots.md) | 002, 004, 013 |

## Completed

| # | Spec |
|---|---|
| 001 | [Repo bootstrap & deploy](completed/001-repo-bootstrap.md) |
| 004 | [Photo storage & serving](completed/004-photo-storage.md) |
| 002 | [Submit API](completed/002-submit-api.md) |
| 003 | [Submit page](completed/003-submit-page.md) |
| 005 | [Admin API & page](completed/005-admin.md) |
| 006 | [Feed API](completed/006-feed-api.md) |
| 007 | [Display page](completed/007-display-page.md) |
| 008 | [Comments API & form](completed/008-comments.md) |
| 009 | [Comments on display](completed/009-comments-display.md) |
| 010 | [Poster page](completed/010-poster-page.md) |
| 012 | [Legal pages & board seed](completed/012-legal-board-seed.md) |

Overview contract: [wiki/architecture/mvp-spec.md](../architecture/mvp-spec.md)
