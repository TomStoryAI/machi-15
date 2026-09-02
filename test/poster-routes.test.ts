import { beforeAll, describe, expect, it } from 'vitest'
import app from '../src/index'
import { adminDb, type FakePost } from './helpers/fake-db'
import { sha256Hex } from '../src/crypto'

let db: ReturnType<typeof adminDb>

const TOKEN = 'secret-token'
let tokenHash: string

const posterPost: FakePost = {
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
  status: 'live',
  expires_at: '2026-09-16T12:00:00.000Z',
  approved_at: '2026-09-02 12:00:00',
  created_at: '2026-09-02 10:00:00',
}

beforeAll(async () => {
  tokenHash = await sha256Hex(TOKEN)
  db = adminDb({
    board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' },
    posts: [{ ...posterPost, mgmt_token_hash: tokenHash }],
    comments: [
      { id: 'c-live', post_id: 'post-1', body: 'Toller Post!', status: 'live', created_at: '2026-09-02 13:00:00' },
      { id: 'c-pending', post_id: 'post-1', body: 'Noch nicht frei.', status: 'pending', created_at: '2026-09-02 13:05:00' },
    ],
  })
})

function get(token: string | null, id = 'post-1') {
  const q = token === null ? '' : `?t=${encodeURIComponent(token)}`
  return app.request(`/api/posts/${id}${q}`, {}, { DB: db } as never)
}

function del(token: string | null, id = 'post-1') {
  const q = token === null ? '' : `?t=${encodeURIComponent(token)}`
  return app.request(`/api/posts/${id}${q}`, { method: 'DELETE' }, { DB: db } as never)
}

describe('GET /api/posts/{id}?t={token}', () => {
  it('returns status and approved comments for the correct token', async () => {
    const res = await get(TOKEN)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('post-1')
    expect(json.title).toBe('Biete: Gassi gehen')
    expect(json.status).toBe('live')
    expect(json.comments.map((c: { id: string }) => c.id)).toEqual(['c-live'])
  })

  it('returns 404 for a wrong token', async () => {
    expect((await get('falsch')).status).toBe(404)
  })

  it('returns 404 for a missing token', async () => {
    expect((await get(null)).status).toBe(404)
  })

  it('returns 404 for an unknown post', async () => {
    expect((await get(TOKEN, 'unbekannt')).status).toBe(404)
  })

  it('does not leak the token hash in the response', async () => {
    const json = await (await get(TOKEN)).json()
    expect(JSON.stringify(json)).not.toContain(tokenHash)
  })
})

describe('DELETE /api/posts/{id}?t={token}', () => {
  it('marks the post deleted for the correct token', async () => {
    const res = await del(TOKEN)
    expect(res.status).toBe(200)
    expect(db._state().posts[0].status).toBe('deleted')
  })

  it('returns 404 for a wrong token and leaves the post untouched', async () => {
    db._setPostStatus('post-1', 'live')
    const res = await del('falsch')
    expect(res.status).toBe(404)
    expect(db._state().posts[0].status).not.toBe('deleted')
  })

  it('returns 404 for a missing token', async () => {
    expect((await del(null)).status).toBe(404)
  })
})

describe('after deletion', () => {
  it('GET with the correct token reports the deleted state', async () => {
    db._setPostStatus('post-1', 'deleted')
    const json = await (await get(TOKEN)).json()
    expect(json.status).toBe('deleted')
  })
})
