import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { sha256Hex } from './crypto'

export const COMMENT_MAX = 500
export const COMMENT_WINDOW_MINUTES = 10
export const COMMENT_LIMIT = 5

export const commentsRoutes = new Hono()

// Add a comment to a live, non-expired post. Lands as pending in the same moderation queue as posts.
commentsRoutes.post('/api/posts/:id/comments', async (c) => {
  const db = c.env.DB as D1Database
  const postId = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const text =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).body === 'string'
      ? ((body as Record<string, unknown>).body as string).trim()
      : ''
  if (!text) return c.json({ error: 'Bitte gib einen Kommentar ein.' }, 400)
  if (text.length > COMMENT_MAX) return c.json({ error: 'Der Kommentar ist zu lang.' }, 400)

  const post = await db
    .prepare('SELECT id, status, expires_at FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ id: string; status: string; expires_at: string | null }>()
  const visible = post && post.status === 'live' && (!post.expires_at || new Date(post.expires_at).getTime() > Date.now())
  if (!visible) return c.json({ error: 'Inserat nicht gefunden.' }, 404)

  const ip = (c.req.header('cf-connecting-ip') ?? 'local').split(',')[0].trim()
  const ipHash = await sha256Hex(ip)
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at >= datetime('now', '-10 minutes')`)
    .bind(ipHash)
    .first<{ n: number }>()
  if ((recent?.n ?? 0) >= COMMENT_LIMIT) {
    return c.json({ error: 'Danke! Du hast in letzter Zeit schon genug kommentiert. Bitte warte ein paar Minuten.' }, 429)
  }

  const id = crypto.randomUUID()
  await db
    .prepare(`INSERT INTO comments (id, post_id, body, status, ip_hash) VALUES (?, ?, ?, 'pending', ?)`)
    .bind(id, postId, text, ipHash)
    .run()
  return c.json({ commentId: id }, 201)
})
