#!/usr/bin/env node
// Spec gate — enforces the OKF convention: requirements and numbered specs come FIRST.
//
// PreToolUse (Write|Edit on src/, public/, migrations/): blocks (exit 2) while
// wiki/specs/created/ has no unblocked spec — i.e. new work must start as a spec file.
// UserPromptSubmit: reminds that new/changed requirements go into the wiki first.
//
// The gate never blocks wiki/**, test/**, .claude/** or Bash — those are the tools
// you use to write the spec and its failing tests first.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

let input = ''
for await (const chunk of process.stdin) input += chunk
let data = {}
try {
  data = JSON.parse(input || '{}')
} catch {
  /* not JSON — ignore */
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function relPath(p) {
  const norm = String(p ?? '').split('\\').join('/')
  const cwd = process.cwd().split('\\').join('/')
  if (norm.toLowerCase().startsWith(cwd.toLowerCase() + '/')) return norm.slice(cwd.length + 1)
  return norm
}

const GATED = /^(src|public|migrations)\//

function createdSpecs() {
  const dir = join(repoRoot, 'wiki', 'specs', 'created')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md'))
}

// Specs whose index row is marked "blocked" do not unblock implementation.
function blockedSpecNumbers() {
  try {
    const index = readFileSync(join(repoRoot, 'wiki', 'specs', 'index.md'), 'utf8')
    const blocked = new Set()
    for (const line of index.split(/\r?\n/)) {
      const m = line.match(/^\|\s*(\d+)\s*\|.*\bblocked\b/i)
      if (m) blocked.add(Number(m[1]))
    }
    return blocked
  } catch {
    return new Set()
  }
}

function unblockedSpecs() {
  const blocked = blockedSpecNumbers()
  return createdSpecs().filter((f) => {
    const m = f.match(/^(\d+)-/)
    return m ? !blocked.has(Number(m[1])) : true
  })
}

// --- PreToolUse gate ---------------------------------------------------------
if (data.tool_name === 'Write' || data.tool_name === 'Edit') {
  const path = relPath(data.tool_input?.file_path ?? '')
  if (!GATED.test(path)) process.exit(0)
  const specs = unblockedSpecs()
  if (specs.length === 0) {
    console.error(
      'SPEC GATE: blocked. wiki/specs/created/ has no unblocked spec. ' +
        'Write requirements into wiki/architecture/mvp-spec.md (or wiki/business/), then create a numbered ' +
        'spec file in wiki/specs/created/ BEFORE touching implementation code. ' +
        'wiki/**, test/**, .claude/** and Bash are never gated.',
    )
    process.exit(2)
  }
  console.error(
    `SPEC GATE: ok, unblocked specs in queue: ${specs.join(', ')}. ` +
      'If this change implements something NOT covered by one of these, write that spec first.',
  )
  process.exit(0)
}

// --- UserPromptSubmit reminder ----------------------------------------------
if (typeof data.prompt === 'string') {
  const prompt = data.prompt.toLowerCase()
  const keywords = [
    'anforderung', 'soll', 'muss', 'wichtig', 'requirement', 'feature', 'funktion',
    'baue', 'implementiere', 'hinzufügen', 'ändere', 'ändern', 'layout', 'design',
    'tile', 'sponsor', 'spezifikation', 'spec', 'genau',
  ]
  if (keywords.some((k) => prompt.includes(k))) {
    console.error(
      'WIKI-FIRST: if this states a new or changed requirement, record it in the wiki FIRST ' +
        '(wiki/architecture/mvp-spec.md or wiki/business/) and create/update a numbered spec in ' +
        'wiki/specs/created/ BEFORE implementation. The spec gate blocks src/, public/ and migrations/ ' +
        'edits while no unblocked spec exists.',
    )
  }
  process.exit(0)
}

process.exit(0)
