#!/usr/bin/env node
// Idempotent board seed for machi-15 (spec 012).
//
// Usage (run from the repo root):
//   node scripts/seed-board.mjs --password <admin-password> [options]
//
// Options:
//   --board-id <id>          default: b1
//   --name <name>            board name, default: Test-Board
//   --location <loc>         board location
//   --promoter-name <name>   default: REWE FAMILIE SCHULZE
//   --promoter-slogan <txt>  default: Mehr Naehe geht nicht.
//   --remote                 apply to the remote (production) D1 instead of local
//
// The password is hashed with PBKDF2-SHA256 (100k iterations) in the same
// "pbkdf2-sha256$iters$salt$hash" format the Worker verifies (src/admin.ts).
// The seed is an upsert: running it twice still yields exactly one board row.

import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PBKDF2_ITERATIONS = 100_000

export function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = randomBytes(16)
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash}`
}

function sqlString(value) {
  return value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`
}

export function seedSql(board) {
  return `INSERT INTO boards (id, name, location, admin_password_hash, promoter_name, promoter_logo_key, promoter_slogan)
VALUES (${sqlString(board.id)}, ${sqlString(board.name)}, ${sqlString(board.location ?? null)}, ${sqlString(board.adminPasswordHash)}, ${sqlString(board.promoterName ?? null)}, ${sqlString(board.promoterLogoKey ?? null)}, ${sqlString(board.promoterSlogan ?? null)})
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  location = excluded.location,
  admin_password_hash = excluded.admin_password_hash,
  promoter_name = excluded.promoter_name,
  promoter_logo_key = excluded.promoter_logo_key,
  promoter_slogan = excluded.promoter_slogan`
}

function parseArgs(argv) {
  const args = {
    boardId: 'b1',
    name: 'Test-Board',
    location: null,
    promoterName: 'REWE FAMILIE SCHULZE',
    promoterSlogan: 'Mehr Naehe geht nicht.',
    password: null,
    remote: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--board-id') args.boardId = next()
    else if (a === '--name') args.name = next()
    else if (a === '--location') args.location = next()
    else if (a === '--promoter-name') args.promoterName = next()
    else if (a === '--promoter-slogan') args.promoterSlogan = next()
    else if (a === '--password') args.password = next()
    else if (a === '--remote') args.remote = true
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.password) {
    console.error('Missing --password <admin-password>.')
    process.exit(1)
  }

  const sql = seedSql({
    id: args.boardId,
    name: args.name,
    location: args.location,
    adminPasswordHash: hashPassword(args.password),
    promoterName: args.promoterName,
    promoterLogoKey: null,
    promoterSlogan: args.promoterSlogan,
  })

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const sqlFile = join(repoRoot, '.wrangler', 'seed-board.sql')
  writeFileSync(sqlFile, sql, 'utf8')
  const wrangler = join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler')
  const d1Args = ['d1', 'execute', 'machi15-db', ...(args.remote ? ['--remote'] : []), '--file', sqlFile]
  const result = spawnSync(wrangler, d1Args, { cwd: repoRoot, shell: process.platform === 'win32', stdio: 'inherit' })
  unlinkSync(sqlFile)
  if (result.status !== 0) {
    console.error('Seed failed. Make sure wrangler is installed (npm install) and logged in (wrangler login).')
    process.exit(result.status ?? 1)
  }
  console.log(`Board ${args.boardId} seeded (${args.remote ? 'remote' : 'local'}).`)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main()
