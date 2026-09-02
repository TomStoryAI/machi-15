---
type: Spec
title: 012 — Legal pages & board seed
description: Impressum, Datenschutz, and a seed script for the first board.
---

# 012 — Legal pages & board seed

## Goal

The installation is legally presentable in Germany and the first board exists.

## Scope

* Static Impressum + Datenschutz pages (German, linked from submit and display)
  * Operator identity placeholder — Tom must fill in real data before going public
* Seed script: creates board 1 with name, location, admin password (hashed), promoter fields (REWE / FAMILIE SCHULZE / slogan — wording from verify-me list)
* Confirm exact display header wording with Tom (verify-me item)

## Acceptance criteria

* Both legal pages reachable from every public page
* Seed creates exactly one board, idempotently

## Depends on

* [001 — Repo bootstrap & deploy](001-repo-bootstrap.md)

## Related

* [MVP spec — verify-me items](../architecture/mvp-spec.md)
* [Positioning — legal](../business/positioning.md)
