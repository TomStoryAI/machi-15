import { beforeAll, describe, expect, it } from 'vitest'
import app from '../src/index'
import { hashAdminPassword } from '../src/admin'
import { adminDb, type FakeComment, type FakePost } from './helpers/fake-db'

let db: ReturnType<typeof adminDb>

const pendingPost: FakePost = {
  id: 'post-1',
  board_id: 'b1',
  category: 'Biete',
  title: 'Biete: Gassi gehen',
  body: 'Für Hunde in der Nachbarschaft.',
  photo_key: null,
  contact_phone: '0151 123',
  contact_email: null,
  contact_whatsapp: null,
  contact_instagram: null,
  contact_address: null,
  duration_weeks: 1,
  status: 'pending',
  expires_at: null,
  approved_at: null,
  created_at: '2026-09-02 10:00:00',
}

const pendingComment: FakeComment = {
  id: 'comment-1',
  post_id: 'post-1',
  body: 'Toller Post!',
  status: 'pending',
  created_at: '2026-09-02 10:05:00',
}

beforeAll(async () => {
  db = adminDb({
    board: { id: 'b1', name: 'Test-Board', admin_password_hash: await hashAdminPassword('geheim', { iterations: 1000 }) },
    posts: [pendingPost],
    comments: [pendingComment],
  })
})

function request(path: string, init: RequestInit = {}) {
  return app.request(path, init, { DB: db } as never)
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}

async function login(password = 'geheim', board = 'b1') {
  const res = await request(`/api/admin/${board}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res
}

describe('POST /api/admin/{boardId}/login', () => {
  it('returns a session token for the correct password', async () => {
    const res = await login()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.token).toBe('string')
    expect(json.token.length).toBeGreaterThan(20)
    expect(typeof json.expiresAt).toBe('string')
  })

  it('rejects a wrong password with a generic German 401', async () => {
    const res = await login('falsch')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Anmeldung fehlgeschlagen.' })
  })

  it('rejects an unknown board with the same generic 401', async () => {
    const res = await login('geheim', 'nope')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Anmeldung fehlgeschlagen.' })
  })

  it('rejects a missing password with the same generic 401', async () => {
    const res = await request('/api/admin/b1/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Anmeldung fehlgeschlagen.' })
  })
})

describe('authed admin endpoints', () => {
  it('returns 401 without a token', async () => {
    for (const path of ['/api/admin/b1/pending', '/api/admin/b1/live', '/api/admin/b1/posts/post-1/approve']) {
      const res = await request(path, { method: path.includes('approve') ? 'POST' : 'GET' })
      expect(res.status).toBe(401)
      expect((await res.json()).error).toContain('Sitzung')
    }
  })

  it('returns 401 for an expired session', async () => {
    const token = (await (await login()).json()).token
    const sessions = db._state().sessions
    sessions[sessions.length - 1].expires_at = '2020-01-01T00:00:00.000Z'
    const res = await request('/api/admin/b1/pending', { headers: bearer(token) })
    expect(res.status).toBe(401)
  })

  it('returns 401 when the session belongs to another board', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b2/pending', { headers: bearer(token) })
    expect(res.status).toBe(401)
  })

  it('lists pending posts and comments', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/pending', { headers: bearer(token) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.posts).toHaveLength(1)
    expect(json.posts[0].title).toBe('Biete: Gassi gehen')
    expect(json.comments).toHaveLength(1)
    expect(json.comments[0].postTitle).toBe('Biete: Gassi gehen')
  })

  it('lists live posts', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/live', { headers: bearer(token) })
    expect(res.status).toBe(200)
    expect((await res.json()).posts).toEqual([])
  })

  it('approves a post: live with an expiry date', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/posts/post-1/approve', { method: 'POST', headers: bearer(token) })
    expect(res.status).toBe(200)
    const state = db._state()
    expect(state.posts[0].status).toBe('live')
    expect(state.posts[0].expires_at).toBeTruthy()
    expect(new Date(state.posts[0].expires_at!).getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000)
  })

  it('rejects a post', async () => {
    db._state().posts[0].status = 'pending'
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/posts/post-1/reject', { method: 'POST', headers: bearer(token) })
    expect(res.status).toBe(200)
    expect(db._state().posts[0].status).toBe('rejected')
  })

  it('approves a pending comment', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/comments/comment-1/approve', { method: 'POST', headers: bearer(token) })
    expect(res.status).toBe(200)
    expect(db._state().comments[0].status).toBe('live')
  })

  it('returns 404 for an unknown comment', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/comments/unknown/reject', { method: 'POST', headers: bearer(token) })
    expect(res.status).toBe(404)
  })

  it('deletes a post and its comments and photos', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/posts/post-1', { method: 'DELETE', headers: bearer(token) })
    expect(res.status).toBe(200)
    const state = db._state()
    expect(state.posts).toHaveLength(0)
    expect(state.comments).toHaveLength(0)
    expect(state.photos).toHaveLength(0)
  })

  it('returns 404 for an unknown post', async () => {
    const token = (await (await login()).json()).token
    const res = await request('/api/admin/b1/posts/unknown', { method: 'DELETE', headers: bearer(token) })
    expect(res.status).toBe(404)
  })
})
