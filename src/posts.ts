import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { generateToken, sha256Hex } from './crypto'

export const CATEGORIES = ['Biete', 'Suche', 'Verkaufen', 'Veranstaltungen', 'Sonstiges'] as const

const TITLE_MAX = 80
const BODY_MAX = 500
const CONTACT_MAX = 200
const HOURLY_POST_LIMIT = 3

export type PostInput = {
  boardId: string
  category: string
  title: string
  body: string
  durationWeeks: number
  contactPhone?: string
  contactEmail?: string
  contactWhatsapp?: string
  contactInstagram?: string
  contactAddress?: string
}

type ValidationResult = { ok: true; value: PostInput } | { ok: false; error: string }

export function validatePostInput(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Ungültige Anfrage.' }
  }
  const b = input as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  const title = str(b.title)
  const body = str(b.body)
  const category = str(b.category)
  const boardId = str(b.boardId)
  const durationWeeks = Number(b.durationWeeks)

  if (!boardId) return { ok: false, error: 'Brett fehlt.' }
  if (!title) return { ok: false, error: 'Bitte gib einen Titel an.' }
  if (!body) return { ok: false, error: 'Bitte gib einen Text an.' }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { ok: false, error: 'Bitte wähle eine gültige Kategorie.' }
  }
  if (durationWeeks !== 1 && durationWeeks !== 2) {
    return { ok: false, error: 'Laufzeit: bitte 1 oder 2 Wochen wählen.' }
  }
  if (title.length > TITLE_MAX || body.length > BODY_MAX) {
    return { ok: false, error: 'Titel oder Text ist zu lang.' }
  }
  const contactFields = ['contactPhone', 'contactEmail', 'contactWhatsapp', 'contactInstagram', 'contactAddress'] as const
  for (const field of contactFields) {
    if (str(b[field]).length > CONTACT_MAX) {
      return { ok: false, error: 'Kontaktfeld ist zu lang.' }
    }
  }

  return {
    ok: true,
    value: {
      boardId,
      category,
      title,
      body,
      durationWeeks,
      ...Object.fromEntries(contactFields.map((f) => [f, str(b[f]) || undefined])),
    },
  }
}

export async function boardExists(db: D1Database, boardId: string): Promise<boolean> {
  const row = await db.prepare('SELECT id FROM boards WHERE id = ?').bind(boardId).first()
  return row !== null
}

export async function countRecentPosts(db: D1Database, ipHash: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE ip_hash = ? AND created_at >= datetime('now', '-1 hour')")
    .bind(ipHash)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function insertPost(db: D1Database, value: PostInput, ipHash: string, tokenHash: string): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO posts (id, board_id, category, title, body, contact_phone, contact_email, contact_whatsapp,
        contact_instagram, contact_address, duration_weeks, status, mgmt_token_hash, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(
      id,
      value.boardId,
      value.category,
      value.title,
      value.body,
      value.contactPhone ?? null,
      value.contactEmail ?? null,
      value.contactWhatsapp ?? null,
      value.contactInstagram ?? null,
      value.contactAddress ?? null,
      value.durationWeeks,
      tokenHash,
      ipHash,
    )
    .run()
  return id
}

export const postsRoutes = new Hono()

postsRoutes.post('/api/posts', async (c) => {
  const db = c.env.DB as D1Database
  const body = await c.req.json().catch(() => null)
  const v = validatePostInput(body)
  if (!v.ok) return c.json({ error: v.error }, 400)

  if (!(await boardExists(db, v.value.boardId))) {
    return c.json({ error: 'Brett nicht gefunden.' }, 400)
  }

  const ip = (c.req.header('cf-connecting-ip') ?? 'local').split(',')[0].trim()
  const ipHash = await sha256Hex(ip)
  const recent = await countRecentPosts(db, ipHash)
  if (recent >= HOURLY_POST_LIMIT) {
    return c.json({ error: 'Danke! Du hast diese Stunde schon genug gepostet. Bitte warte eine Stunde.' }, 429)
  }

  const token = generateToken()
  const tokenHash = await sha256Hex(token)
  const postId = await insertPost(db, v.value, ipHash, tokenHash)
  return c.json({ postId, mgmtToken: token }, 201)
})
