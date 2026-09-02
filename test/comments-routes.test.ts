import { beforeAll, describe, expect, it } from 'vitest'
import app from '../src/index'
import { adminDb, type FakePost } from './helpers/fake-db'

let db: ReturnType<typeof adminDb>

function post(id: string, overrides: Partial<FakePost> = {}): FakePost {
  return {
    id,
    board_id: 'b1',
    category: 'Biete',
    title: `Titel ${id}`,
    body: `Text ${id}`,
    photo_key: null,
    contact_phone: null,
    contact_email: null,
    contact_whatsapp: null,
    contact_instagram: null,
    contact_address: null,
    duration_weeks: 1,
    status: 'live',
    expires_at: '2026-09-16T12:00:00.000Z',
    approved_at: '2026-09-02 12:00:00',
    created_at: '2026-09-02 10:00:00',
    ...overrides,
  }
}

beforeAll(() => {
  db = adminDb({
    board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' },
    posts: [
      post('p-live'),
      post('p-pending', { status: 'pending', approved_at: null, expires_at: null }),
      post('p-expired', { expires_at: '2026-08-01T12:00:00.000Z' }),
    ],
    recentComments: 0,
  })
})

function comment(postId: string, body: unknown) {
  return app.request(
    `/api/posts/${postId}/comments`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) },
    { DB: db } as never,
  )
}

describe('POST /api/posts/{id}/comments', () => {
  it('creates a pending comment on a live post', async () => {
    const res = await comment('p-live', 'Toller Post!')
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.commentId).toBeTruthy()
    const state = db._state()
    const created = state.comments[state.comments.length - 1]
    expect(created.post_id).toBe('p-live')
    expect(created.body).toBe('Toller Post!')
    expect(created.status).toBe('pending')
  })

  it('rejects an empty body with a German 400', async () => {
    const res = await comment('p-live', '   ')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Kommentar')
  })

  it('rejects an oversized body with a German 400', async () => {
    const res = await comment('p-live', 'x'.repeat(501))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('zu lang')
  })

  it('returns 404 when the post is pending', async () => {
    const res = await comment('p-pending', 'Hallo?')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('Inserat')
  })

  it('returns 404 when the post is expired', async () => {
    const res = await comment('p-expired', 'Hallo?')
    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown post', async () => {
    const res = await comment('unbekannt', 'Hallo?')
    expect(res.status).toBe(404)
  })

  it('rate limits: 6th comment within 10 minutes gets a friendly 429', async () => {
    db._state().recentComments = 5
    const res = await comment('p-live', 'Noch einer?')
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('kommentiert')
  })
})
