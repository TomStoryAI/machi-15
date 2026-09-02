import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { POST_COLUMNS, mapPost, type PostRow } from './post-mapper'

type BoardRow = {
  name: string
  promoter_name: string | null
  promoter_logo_key: string | null
  promoter_slogan: string | null
}

type FeedPostRow = PostRow & { approved_at: string | null; expires_at: string | null }
type FeedCommentRow = { id: string; post_id: string; body: string; created_at: string }

export const feedRoutes = new Hono()

// One JSON call for the display: board config + live, non-expired posts with approved comments.
feedRoutes.get('/api/boards/:boardId/feed', async (c) => {
  const db = c.env.DB as D1Database
  const boardId = c.req.param('boardId')

  const board = await db
    .prepare('SELECT name, promoter_name, promoter_logo_key, promoter_slogan FROM boards WHERE id = ?')
    .bind(boardId)
    .first<BoardRow>()
  if (!board) return c.json({ error: 'Brett nicht gefunden.' }, 404)

  const posts = await db
    .prepare(
      `SELECT ${POST_COLUMNS}, approved_at, expires_at
       FROM posts WHERE board_id = ? AND status = 'live' ORDER BY approved_at DESC`,
    )
    .bind(boardId)
    .all<FeedPostRow>()

  const now = Date.now()
  // Comments are private (poster page only, spec 009 revised 2026-09-02) — never in the public feed.
  const livePosts = (posts.results ?? [])
    .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
    .map((p) => ({
      ...mapPost(p),
      approvedAt: p.approved_at,
    }))

  return c.json({
    board: {
      id: boardId,
      name: board.name,
      promoterName: board.promoter_name,
      promoterLogoKey: board.promoter_logo_key,
      promoterSlogan: board.promoter_slogan,
    },
    posts: livePosts,
  })
})
