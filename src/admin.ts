import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { generateToken, sha256Hex } from './crypto'

export const PBKDF2_ITERATIONS = 100_000
export const SESSION_TTL_DAYS = 7

const enc = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Constant-time comparison for hex digests (no early exit on mismatch).
function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function pbkdf2Hex(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

// Stored format: "pbkdf2-sha256$<iterations>$<saltB64>$<hashHex>" — spec 012's seed uses this.
export async function hashAdminPassword(
  password: string,
  opts: { iterations?: number; salt?: Uint8Array } = {},
): Promise<string> {
  const iterations = opts.iterations ?? PBKDF2_ITERATIONS
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const hex = await pbkdf2Hex(password, salt, iterations)
  return `pbkdf2-sha256$${iterations}$${bytesToB64(salt)}$${hex}`
}

export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false
  const expected = parts[3].toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(expected)) return false
  let salt: Uint8Array
  try {
    salt = b64ToBytes(parts[2])
  } catch {
    return false
  }
  const actual = await pbkdf2Hex(password, salt, iterations)
  return hexEqual(actual, expected)
}

export async function createSession(db: D1Database, boardId: string): Promise<{ token: string; expiresAt: string }> {
  const token = generateToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000).toISOString()
  await db
    .prepare('INSERT INTO admin_sessions (token_hash, board_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, boardId, expiresAt)
    .run()
  return { token, expiresAt }
}

export async function sessionValid(db: D1Database, boardId: string, token: string): Promise<boolean> {
  const tokenHash = await sha256Hex(token)
  const row = await db
    .prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ? AND board_id = ?')
    .bind(tokenHash, boardId)
    .first<{ expires_at: string }>()
  if (!row) return false
  return new Date(row.expires_at).getTime() > Date.now()
}

const UNAUTHORIZED = { error: 'Sitzung abgelaufen. Bitte erneut anmelden.' }

async function requireAdmin(db: D1Database, c: Context): Promise<boolean> {
  const boardId = c.req.param('boardId')
  const header = c.req.header('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return false
  return sessionValid(db, boardId, header.slice(7))
}

type PostRow = {
  id: string
  category: string
  title: string
  body: string
  photo_key: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  contact_instagram: string | null
  contact_address: string | null
  duration_weeks: number
  created_at: string
}

function mapPost(row: PostRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    photoKey: row.photo_key,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    contactWhatsapp: row.contact_whatsapp,
    contactInstagram: row.contact_instagram,
    contactAddress: row.contact_address,
    durationWeeks: row.duration_weeks,
    createdAt: row.created_at,
  }
}

const POST_COLUMNS =
  'id, category, title, body, photo_key, contact_phone, contact_email, contact_whatsapp, contact_instagram, contact_address, duration_weeks, created_at'

export const adminRoutes = new Hono()

adminRoutes.post('/api/admin/:boardId/login', async (c) => {
  const db = c.env.DB as D1Database
  const boardId = c.req.param('boardId')
  const body = await c.req.json().catch(() => null)
  const password =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).password === 'string'
      ? ((body as Record<string, unknown>).password as string)
      : ''
  const board = await db
    .prepare('SELECT admin_password_hash FROM boards WHERE id = ?')
    .bind(boardId)
    .first<{ admin_password_hash: string }>()
  if (!board || !(await verifyAdminPassword(password, board.admin_password_hash))) {
    return c.json({ error: 'Anmeldung fehlgeschlagen.' }, 401)
  }
  return c.json(await createSession(db, boardId))
})

adminRoutes.get('/api/admin/:boardId/pending', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const boardId = c.req.param('boardId')
  const posts = await db
    .prepare(`SELECT ${POST_COLUMNS} FROM posts WHERE board_id = ? AND status = 'pending' ORDER BY created_at`)
    .bind(boardId)
    .all<PostRow>()
  const comments = await db
    .prepare(
      `SELECT c.id, c.post_id, c.body, c.created_at, p.title AS post_title
       FROM comments c JOIN posts p ON p.id = c.post_id
       WHERE p.board_id = ? AND c.status = 'pending' ORDER BY c.created_at`,
    )
    .bind(boardId)
    .all<{ id: string; post_id: string; body: string; created_at: string; post_title: string }>()
  return c.json({
    posts: (posts.results ?? []).map(mapPost),
    comments: (comments.results ?? []).map((r) => ({
      id: r.id,
      postId: r.post_id,
      postTitle: r.post_title,
      body: r.body,
      createdAt: r.created_at,
    })),
  })
})

adminRoutes.get('/api/admin/:boardId/live', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const boardId = c.req.param('boardId')
  const posts = await db
    .prepare(`SELECT ${POST_COLUMNS} FROM posts WHERE board_id = ? AND status = 'live' ORDER BY approved_at DESC`)
    .bind(boardId)
    .all<PostRow>()
  return c.json({ posts: (posts.results ?? []).map(mapPost) })
})

adminRoutes.post('/api/admin/:boardId/posts/:id/approve', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const { boardId, id } = c.req.param()
  const post = await db
    .prepare('SELECT duration_weeks FROM posts WHERE id = ? AND board_id = ?')
    .bind(id, boardId)
    .first<{ duration_weeks: number }>()
  if (!post) return c.json({ error: 'Inserat nicht gefunden.' }, 404)
  const expiresAt = new Date(Date.now() + post.duration_weeks * 7 * 24 * 3600 * 1000).toISOString()
  await db
    .prepare(`UPDATE posts SET status = 'live', approved_at = datetime('now'), expires_at = ? WHERE id = ? AND board_id = ?`)
    .bind(expiresAt, id, boardId)
    .run()
  return c.json({ status: 'live' })
})

adminRoutes.post('/api/admin/:boardId/posts/:id/reject', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const { boardId, id } = c.req.param()
  const r = await db
    .prepare(`UPDATE posts SET status = 'rejected' WHERE id = ? AND board_id = ? AND status = 'pending'`)
    .bind(id, boardId)
    .run()
  if (!r.meta.changes) return c.json({ error: 'Inserat nicht gefunden.' }, 404)
  return c.json({ status: 'rejected' })
})

adminRoutes.post('/api/admin/:boardId/comments/:id/approve', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const { boardId, id } = c.req.param()
  const r = await db
    .prepare(
      `UPDATE comments SET status = 'live'
       WHERE id = ? AND status = 'pending'
       AND EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id AND posts.board_id = ?)`,
    )
    .bind(id, boardId)
    .run()
  if (!r.meta.changes) return c.json({ error: 'Kommentar nicht gefunden.' }, 404)
  return c.json({ status: 'live' })
})

adminRoutes.post('/api/admin/:boardId/comments/:id/reject', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const { boardId, id } = c.req.param()
  const r = await db
    .prepare(
      `UPDATE comments SET status = 'rejected'
       WHERE id = ? AND status = 'pending'
       AND EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id AND posts.board_id = ?)`,
    )
    .bind(id, boardId)
    .run()
  if (!r.meta.changes) return c.json({ error: 'Kommentar nicht gefunden.' }, 404)
  return c.json({ status: 'rejected' })
})

adminRoutes.delete('/api/admin/:boardId/posts/:id', async (c) => {
  const db = c.env.DB as D1Database
  if (!(await requireAdmin(db, c))) return c.json(UNAUTHORIZED, 401)
  const { boardId, id } = c.req.param()
  await db.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run()
  const r = await db.prepare('DELETE FROM posts WHERE id = ? AND board_id = ?').bind(id, boardId).run()
  if (!r.meta.changes) return c.json({ error: 'Inserat nicht gefunden.' }, 404)
  return c.json({ ok: true })
})
