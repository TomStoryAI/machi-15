---
type: Reference
title: OKF format
description: How this knowledge base is structured — Open Knowledge Format conventions.
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
---

# OKF format

This `wiki/` folder is an OKF (Open Knowledge Format) bundle — Google's vendor-neutral spec for AI-agent knowledge.

## Rules in use

* **One concept = one small markdown file.** The file path without `.md` is the concept's ID and identity.
* **Frontmatter**: only `type` is required; optional: `title`, `description`, `resource`, `tags`, `status: draft | stable | deprecated`.
* **Reserved files**: `index.md` (directory listing for progressive disclosure; no frontmatter except root's `okf_version`) and `log.md` (chronological log, newest first, no frontmatter). They are never concepts.
* **Links are the graph** — prefer bundle-relative paths; broken links are allowed (drafts welcome).
* Structural markdown (headings, tables, lists) over free-form prose.

## Governance

* The wiki **grows organically**: Tom and the AI add pages as decisions are made.
* **The wiki is the source of truth** — implementation is driven from pages here (see CLAUDE.md).
* Don't invent structure or facts: better a smaller true bundle than a large fictional one; ask a human when sources are ambiguous.
