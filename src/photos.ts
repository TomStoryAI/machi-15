import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { sha256Hex } from './crypto'
import { findPostByToken } from './poster'
import { sessionValid } from './admin'

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024

type PhotoStore = {
  put: (key: string, postId: string, contentType: string, data: ArrayBuffer) => Promise<void>
  get: (key: string) => Promise<{ data: ArrayBuffer; contentType: string | null } | null>
}

// D1 interim: photos live in the `photos` table as base64 (spec 004, R2 needs card on file).
// R2 end state: same interface against the PHOTOS binding — no caller changes.
function photoStore(env: { PHOTOS?: R2Bucket; DB: D1Database }): PhotoStore {
  if (env.PHOTOS) {
    return {
      async put(key, _postId, contentType, data) {
        await env.PHOTOS!.put(key, data, { httpMetadata: { contentType } })
      },
      async get(key) {
        const obj = await env.PHOTOS!.get(key)
        if (!obj) return null
        return { data: await obj.arrayBuffer(), contentType: obj.httpMetadata?.contentType ?? null }
      },
    }
  }
  return {
    async put(key, postId, contentType, data) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(data)))
      await env.DB.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
        .bind(key, postId, contentType, base64)
        .run()
    },
    async get(key) {
      const row = await env.DB.prepare('SELECT data_base64, content_type FROM photos WHERE key = ?').bind(key).first<{ data_base64: string; content_type: string }>()
      if (!row) return null
      const bin = atob(row.data_base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return { data: bytes.buffer, contentType: row.content_type }
    },
  }
}

type PostAuthRow = {
  id: string
  board_id: string
  status: string
  expires_at: string | null
  mgmt_token_hash: string | null
}

async function photoPost(db: D1Database, key: string): Promise<PostAuthRow | null> {
  return db
    .prepare('SELECT id, board_id, status, expires_at, mgmt_token_hash FROM posts WHERE photo_key = ?')
    .bind(key)
    .first<PostAuthRow>()
}

export const photosRoutes = new Hono()

// Poster uploads a photo for their own ad (management token). Multipart, image only, capped size.
photosRoutes.post('/api/posts/:id/photo', async (c) => {
  const db = c.env.DB as D1Database
  const postId = c.req.param('id')
  const token = c.req.query('t') ?? ''
  const post = await findPostByToken(db, postId, token)
  if (!post) return c.json({ error: 'Inserat nicht gefunden.' }, 404)

  const form = await c.req.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof File)) return c.json({ error: 'Bitte wähle ein Bild aus.' }, 400)
  if (!file.type.startsWith('image/')) return c.json({ error: 'Bitte lade ein Bild hoch (JPG oder PNG).' }, 400)
  if (file.size > PHOTO_MAX_BYTES) return c.json({ error: 'Das Bild ist zu groß (max. 4 MB).' }, 400)

  const key = crypto.randomUUID()
  await photoStore(c.env).put(key, postId, file.type, await file.arrayBuffer())

  const tokenHash = await sha256Hex(token)
  const r = await db.prepare('UPDATE posts SET photo_key = ? WHERE id = ? AND mgmt_token_hash = ?').bind(key, postId, tokenHash).run()
  if (!r.meta.changes) return c.json({ error: 'Inserat nicht gefunden.' }, 404)
  return c.json({ photoKey: key }, 201)
})

// Photo serving: public only while the post is live and non-expired; otherwise admin session or mgmt token.
photosRoutes.get('/api/photos/:key', async (c) => {
  const db = c.env.DB as D1Database
  const key = c.req.param('key')
  const post = await photoPost(db, key)
  if (!post) return c.json({ error: 'Foto nicht gefunden.' }, 404)

  const publiclyVisible = post.status === 'live' && (!post.expires_at || new Date(post.expires_at).getTime() > Date.now())
  let allowed = publiclyVisible
  if (!allowed) {
    const mgmtToken = c.req.query('t') ?? ''
    if (mgmtToken && post.mgmt_token_hash && post.mgmt_token_hash === (await sha256Hex(mgmtToken))) {
      allowed = true
    }
  }
  if (!allowed) {
    const header = c.req.header('authorization') ?? ''
    if (header.startsWith('Bearer ') && (await sessionValid(db, post.board_id, header.slice(7)))) {
      allowed = true
    }
  }
  if (!allowed) return c.json({ error: 'Foto nicht gefunden.' }, 404)

  const photo = await photoStore(c.env).get(key)
  if (!photo) return c.json({ error: 'Foto nicht gefunden.' }, 404)
  const headers: Record<string, string> = { 'cache-control': 'public, max-age=300' }
  if (photo.contentType) headers['content-type'] = photo.contentType
  return c.body(photo.data, 200, headers)
})
