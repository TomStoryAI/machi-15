import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { sha256Hex } from './crypto'
import { POST_COLUMNS, mapPost, type PostRow } from './post-mapper'

type PosterPostRow = PostRow & {
  status: string
  mgmt_token_hash: string | null
  approved_at: string | null
  expires_at: string | null
}

export const posterRoutes = new Hono()

export async function findPostByToken(db: D1Database, id: string, token: string): Promise<PosterPostRow | null> {
  const post = await db
    .prepare(`SELECT ${POST_COLUMNS}, status, mgmt_token_hash, approved_at, expires_at FROM posts WHERE id = ?`)
    .bind(id)
    .first<PosterPostRow>()
  if (!post || !token) return null
  if (post.mgmt_token_hash !== (await sha256Hex(token))) return null
  return post
}

// Poster view: own ad's status + approved comments. Wrong/missing token gets the same 404 as an unknown id.
posterRoutes.get('/api/posts/:id', async (c) => {
  const db = c.env.DB as D1Database
  const id = c.req.param('id')
  const post = await findPostByToken(db, id, c.req.query('t') ?? '')
  if (!post) return c.json({ error: 'Inserat nicht gefunden.' }, 404)

  const comments = await db
    .prepare(`SELECT id, body, created_at FROM comments WHERE post_id = ? AND status = 'live' ORDER BY created_at`)
    .bind(id)
    .all<{ id: string; body: string; created_at: string }>()

  return c.json({
    ...mapPost(post),
    status: post.status,
    approvedAt: post.approved_at,
    comments: (comments.results ?? []).map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at })),
  })
})

// Poster deletes their own ad: status change, the feed drops it on the next poll.
posterRoutes.delete('/api/posts/:id', async (c) => {
  const db = c.env.DB as D1Database
  const id = c.req.param('id')
  const token = c.req.query('t') ?? ''
  const post = await findPostByToken(db, id, token)
  if (!post) return c.json({ error: 'Inserat nicht gefunden.' }, 404)

  const tokenHash = await sha256Hex(token)
  await db.prepare(`UPDATE posts SET status = 'deleted' WHERE id = ? AND mgmt_token_hash = ?`).bind(id, tokenHash).run()
  return c.json({ ok: true })
})
