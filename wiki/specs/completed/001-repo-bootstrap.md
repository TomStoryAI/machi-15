---
type: Spec
title: 001 — Repo bootstrap & deploy
description: Cloudflare project skeleton with Worker, D1, R2, Pages — deployable on the free tier.
---

# 001 — Repo bootstrap & deploy

## Goal

A working machi-15 project skeleton deployed on Cloudflare's free tier.

## Scope

* `wrangler init` (TypeScript, Workers) with Hono router
* `GET /api/health` endpoint
* D1 database created + first migration (schema from [data-model](../architecture/data-model.md))
* R2 bucket created (pending: R2 activation in the Cloudflare dashboard — account-level step, unblocks spec 004)
* Static frontends served via the Worker assets binding (stub pages for display/submit/poster/admin; single deploy target)
* `wrangler.toml` wired (D1 + R2 bindings, routes)
* `.gitignore` (node_modules, .dev.vars, .wrangler)

## Acceptance criteria

* `wrangler dev` runs locally; `/api/health` responds
* `wrangler deploy` succeeds; `/api/health` responds in production
* D1 migration applies cleanly
* Stub pages served via Pages

## Related

* [Deployment](../architecture/deployment.md)
* [Components](../architecture/components.md)
