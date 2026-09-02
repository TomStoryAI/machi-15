# Specs

Build in **number order**. **State = folder**: a spec lives in `created/` until it is implemented AND verified, then its file moves to `completed/` and a `wiki/log.md` entry is added.

## Created (build queue)

| # | Spec | Depends on |
|---|---|---|
| 004 | [Photo storage & serving](created/004-photo-storage.md) — **blocked: R2 not enabled on the account** | 002 |
| 008 | [Comments API & form](created/008-comments.md) | 006 |
| 009 | [Comments on display](created/009-comments-display.md) | 007, 008 |
| 010 | [Poster page](created/010-poster-page.md) | 002 |
| 011 | [Expiry cron](created/011-expiry-cron.md) — **blocked by 004** | 004 |
| 012 | [Legal pages & board seed](created/012-legal-board-seed.md) | 001 |

## Completed

| # | Spec |
|---|---|
| 001 | [Repo bootstrap & deploy](completed/001-repo-bootstrap.md) |
| 002 | [Submit API](completed/002-submit-api.md) |
| 003 | [Submit page](completed/003-submit-page.md) |
| 005 | [Admin API & page](completed/005-admin.md) |
| 006 | [Feed API](completed/006-feed-api.md) |
| 007 | [Display page](completed/007-display-page.md) |

Overview contract: [wiki/architecture/mvp-spec.md](../architecture/mvp-spec.md)
