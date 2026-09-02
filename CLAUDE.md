# machi-15

Digital "schwarzes Brett" (bulletin board) for public 55" Google-TV displays. Passers-by scan an on-screen QR code and anonymously post free classified ads (text-only or with photo). An admin approves posts and comments before anything appears on the board. Domain: machi15.com.

## Hard constraints

- **Zero cost** — must run on Cloudflare's free tier (Pages, Workers 100k req/day, D1 5GB, R2 10GB). Free-tier math is in docs/findings-2026-09-02.md.
- **Anonymous users** — no accounts, no email. Posters get a management-token URL to view comments / delete their ad.
- **TV browser compatibility** — the display page is vanilla HTML/CSS/JS, no frameworks, no build step on the display path.
- **Moderation required** — nothing is publicly visible before admin approval (posts AND comments).
- **UI language: German** (target users are local pedestrians).
- **Usability bar** — posting must feel no more complex than writing a note and pinning it to a board.

## Stack (decided 2026-09-02)

- **Cloudflare Pages** — static frontends: TV display, submit form, poster page, admin page
- **Cloudflare Workers** — JSON API + photo serving + scheduled post-expiry job
- **Cloudflare D1** — SQLite: `boards`, `posts`, `comments`
- **Cloudflare R2** — photos (client-side resized to ≤1600px before upload)
- **QR codes** — plain URLs (one per board), no QR service dependency

## Working with this repo

- Local clone: E:\Programmieren\machi-15 (work here, not in the home dir)
- Dev: `wrangler dev` (simulates Workers + D1 + R2 locally)
- Deploy: `wrangler deploy` (Pages connected to GitHub `main` branch)
- Knowledge base: OKF bundle under `wiki/` (see section below)

## Knowledge base (OKF)

`wiki/` is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle. `wiki/business/` = product & commercial; `wiki/architecture/` = technical decisions, constraints, data model. Conventions: one concept per small file, only `type` frontmatter is required, `index.md`/`log.md` are reserved, links are the graph, broken links are allowed (drafts welcome).

**The wiki is the source of truth and grows organically.** If Tom adds or edits a page under `wiki/`, read it and drive implementation from it before writing code.

## Status

Design in progress (brainstorming). No code yet. Next: design part 2 (submit flow, admin flow, error handling, testing) → written spec in wiki/architecture/ → implementation plan. Open questions: wiki/architecture/open-questions.md
