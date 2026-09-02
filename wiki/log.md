# Log

## 2026-09-02

* **Update** — Spec 003 completed: submit page `/b/{boardId}/neu` live — German mobile-first form (category, title, body, optional contact fields, 1/2-week duration), client-side photo resize to ≤1600 px JPEG via canvas, confirmation screen with management link + QR (qrcode-generator vendored into `public/vendor/`, no QR service). TDD: 19 new tests (pure logic, jsdom wiring against the real HTML, route via assets binding) — all green locally and in production (curl 200 + POST 201). Note: photo upload itself stays in 004 (R2); resized blob is prepared client-side only. Real-phone-browser pass still open (manual).
* **Update** — Spec 002 completed: `POST /api/posts` live in production — validation with German 400s, board existence check, per-IP rate limit (3/hour, hashed IP), anonymous management token (hashed at rest). TDD: 12 tests + live integration (201/400/429).
* **Update** — Spec 001 completed: Worker + Hono + `/api/health` live at https://machi-15.machi-15.workers.dev (TDD red-green, D1 remote EEUR with boards/posts/comments, static assets, 404s)
* **Decision** — Single Worker with assets binding replaces the separate Pages project (one deploy target, one domain, no CORS)
* **Note** — R2 activation pending in the Cloudflare dashboard (account-level; may ask for payment info). Unblocks spec 004.
* **Decision** — React reconsidered for the frontend and rejected for the MVP: all four pages stay vanilla HTML/CSS/JS (TV-browser safety on the display, no build step, smallest failure surface). Revisit when the admin grows or platform features arrive.
* **Update** — Specs reorganized into `created/` and `completed/` folders — the folder is the state (replaces the frontmatter status field)
* **Decision** — Spec workflow: small numbered specs in wiki/specs/ (001–012), status `created` → `completed`, built in number order
* **Creation** — wiki/specs/ created: 12 numbered specs + roadmap index (001 bootstrap → 012 legal/seed)
* **Creation** — MVP spec written to wiki/architecture/mvp-spec.md (the overview contract)
* **Update** — Display layout from Tom's mockup screenshot: header "Machi-Board (Display)", promoter tile bottom-right (mockup: REWE / FAMILIE SCHULZE / "Mehr Nähe geht nicht.")
* **Update** — boards table gains promoter fields: promoter_name, promoter_logo_key, promoter_slogan
* **Decision** — Tech stack: vanilla HTML/CSS/JS frontend; Workers + TypeScript + Hono; D1; R2; QR = plain URLs
* **Creation** — OKF knowledge base initialized under `wiki/` (business/, architecture/, references/)
* **Creation** — Repo cloned to E:\Programmieren\machi-15 (repo was empty)
* **Decision** — Deployment: Cloudflare Pages + Workers + D1 + R2, free tier (see architecture/deployment.md)
* **Decision** — Moderation: admin approves posts AND comments before anything is public (see architecture/constraints.md)
* **Decision** — Anonymous posting: no accounts, no email; per-post management token (see architecture/data-model.md)
* **Decision** — Photos resized client-side to ≤1600 px before upload; pending photos private (see architecture/components.md)
* **Decision** — QR codes are plain URLs, one per board; no QR service (see architecture/components.md)
* **Decision** — Design part 1 (architecture & data model) confirmed in brainstorming; part 2 pending
