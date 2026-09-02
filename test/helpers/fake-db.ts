// A small stateful fake of the D1 surface the admin routes use. It implements just
// enough SQL semantics (dispatch on query keywords) to let route tests run end-to-end
// against the real Hono app: login -> session -> pending -> approve/reject/delete.

export type FakeBoard = {
  id: string
  name: string
  admin_password_hash: string
  promoter_name?: string | null
  promoter_logo_key?: string | null
  promoter_slogan?: string | null
}
export type FakePost = {
  id: string
  board_id: string
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
  status: 'pending' | 'live' | 'rejected'
  expires_at: string | null
  approved_at: string | null
  created_at: string
}
export type FakeComment = { id: string; post_id: string; body: string; status: 'pending' | 'live' | 'rejected'; created_at: string }
export type FakeSession = { token_hash: string; board_id: string; expires_at: string }

export function adminDb(seed: { board: FakeBoard; posts?: FakePost[]; comments?: FakeComment[] }) {
  const boards = [seed.board]
  const posts: FakePost[] = seed.posts ?? []
  const comments: FakeComment[] = seed.comments ?? []
  const sessions: FakeSession[] = []

  type Stmt = {
    bind: (...args: unknown[]) => Stmt
    first: <T>() => Promise<T | null>
    all: <T>() => Promise<{ results?: T[] }>
    run: () => Promise<{ meta: { changes: number } }>
  }

  const stmt: Stmt = {
    bind(...args) {
      bound = args
      return stmt
    },
    async first() {
      return firstResult(q) as never
    },
    async all() {
      return { results: allResults(q) } as never
    },
    async run() {
      const changes = runMutation(q)
      return { meta: { changes } }
    },
  }

  let q = ''
  let bound: unknown[] = []

  function firstResult(query: string): unknown {
    if (query.includes('FROM boards')) {
      return boards.find((b) => b.id === bound[0]) ?? null
    }
    if (query.includes('FROM admin_sessions')) {
      const s = sessions.find((row) => row.token_hash === bound[0] && row.board_id === bound[1])
      return s ?? null
    }
    if (query.includes('duration_weeks')) {
      const post = posts.find((p) => p.id === bound[0] && p.board_id === bound[1])
      return post ? { duration_weeks: post.duration_weeks } : null
    }
    return null
  }

  function allResults(query: string): unknown[] {
    if (query.includes('FROM posts')) {
      const status = query.includes("status = 'live'") ? 'live' : 'pending'
      return posts
        .filter((p) => p.board_id === bound[0] && p.status === status)
        .sort((a, b) =>
          status === 'live'
            ? (b.approved_at ?? '').localeCompare(a.approved_at ?? '')
            : a.created_at.localeCompare(b.created_at),
        )
    }
    if (query.includes('FROM comments')) {
      const liveComments = query.includes("c.status = 'live'")
      return comments
        .filter((c) => {
          const post = posts.find((p) => p.id === c.post_id)
          if (!post || post.board_id !== bound[0]) return false
          if (liveComments) return c.status === 'live' && post.status === 'live'
          return c.status === 'pending'
        })
        .map((c) => ({ ...c, post_title: posts.find((p) => p.id === c.post_id)?.title ?? '' }))
    }
    return []
  }

  function runMutation(query: string): number {
    if (query.startsWith('INSERT INTO admin_sessions')) {
      sessions.push({ token_hash: bound[0] as string, board_id: bound[1] as string, expires_at: bound[2] as string })
      return 1
    }
    if (query.startsWith('UPDATE posts')) {
      const post = posts.find((p) => p.id === bound.at(-2) && p.board_id === bound.at(-1))
      if (!post) return 0
      if (query.includes("status = 'live'")) {
        post.status = 'live'
        post.expires_at = bound[0] as string
      } else if (query.includes("status = 'rejected'")) {
        post.status = 'rejected'
      }
      return 1
    }
    if (query.startsWith('UPDATE comments')) {
      const comment = comments.find((c) => c.id === bound[0])
      const post = comment && posts.find((p) => p.id === comment.post_id)
      if (!comment || !post || post.board_id !== bound[1]) return 0
      comment.status = query.includes("status = 'live'") ? 'live' : 'rejected'
      return 1
    }
    if (query.startsWith('DELETE FROM comments')) {
      const before = comments.length
      for (let i = comments.length - 1; i >= 0; i--) {
        if (comments[i].post_id === bound[0]) comments.splice(i, 1)
      }
      return before - comments.length
    }
    if (query.startsWith('DELETE FROM posts')) {
      const idx = posts.findIndex((p) => p.id === bound[0] && p.board_id === bound[1])
      if (idx === -1) return 0
      posts.splice(idx, 1)
      return 1
    }
    return 0
  }

  const db = {
    prepare(query: string): Stmt {
      q = query
      bound = []
      return stmt
    },
    // introspect state in tests
    _state: () => ({ posts: posts.map((p) => ({ ...p })), comments: [...comments], sessions: [...sessions] }),
  }
  return db
}
