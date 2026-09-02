import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export const PHOTO_GRACE_DAYS = 30

type Env = { DB: D1Database; PHOTOS?: R2Bucket }

// Nightly cron (spec 011): live posts past expires_at -> status 'expired' (with expired_at stamped).
export async function expirePosts(db: D1Database): Promise<number> {
  const rows = await db
    .prepare(`SELECT id, expires_at FROM posts WHERE status = 'live' AND expires_at IS NOT NULL`)
    .all<{ id: string; expires_at: string }>()
  const now = Date.now()
  let n = 0
  for (const row of rows.results ?? []) {
    if (new Date(row.expires_at).getTime() <= now) {
      await db
        .prepare(`UPDATE posts SET status = 'expired', expired_at = ? WHERE id = ?`)
        .bind(new Date().toISOString(), row.id)
        .run()
      n++
    }
  }
  return n
}

// Photos of expired posts are deleted after a 30-day grace period (D1 rows or R2 keys).
export async function deleteGracedPhotos(env: Env): Promise<number> {
  const db = env.DB
  const rows = await db
    .prepare(`SELECT id, photo_key, expired_at FROM posts WHERE status = 'expired' AND photo_key IS NOT NULL`)
    .all<{ id: string; photo_key: string; expired_at: string | null }>()
  const cutoff = Date.now() - PHOTO_GRACE_DAYS * 24 * 3600 * 1000
  let n = 0
  for (const row of rows.results ?? []) {
    if (!row.expired_at || new Date(row.expired_at).getTime() > cutoff) continue
    if (env.PHOTOS) {
      await env.PHOTOS.delete(row.photo_key)
    } else {
      await db.prepare('DELETE FROM photos WHERE post_id = ?').bind(row.id).run()
    }
    n++
  }
  return n
}

export async function handleScheduled(env: Env): Promise<{ expiredPosts: number; deletedPhotos: number }> {
  const expiredPosts = await expirePosts(env.DB)
  const deletedPhotos = await deleteGracedPhotos(env)
  console.log(`expiry run: expired=${expiredPosts} photosDeleted=${deletedPhotos}`)
  return { expiredPosts, deletedPhotos }
}
