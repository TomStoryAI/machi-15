# Log

## 2026-09-02

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
