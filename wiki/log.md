# Log

## 2026-09-02

* **Creation** — OKF knowledge base initialized under `wiki/` (business/, architecture/, references/)
* **Creation** — Repo cloned to E:\Programmieren\machi-15 (repo was empty)
* **Decision** — Deployment: Cloudflare Pages + Workers + D1 + R2, free tier (see architecture/deployment.md)
* **Decision** — Moderation: admin approves posts AND comments before anything is public (see architecture/constraints.md)
* **Decision** — Anonymous posting: no accounts, no email; per-post management token (see architecture/data-model.md)
* **Decision** — Photos resized client-side to ≤1600 px before upload; pending photos private (see architecture/components.md)
* **Decision** — QR codes are plain URLs, one per board; no QR service (see architecture/components.md)
* **Decision** — Design part 1 (architecture & data model) confirmed in brainstorming; part 2 pending
