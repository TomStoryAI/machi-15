import { beforeAll, describe, expect, it } from 'vitest'
import app from '../src/index'
import { adminDb, type FakeComment, type FakePost } from './helpers/fake-db'

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
    board: {
      id: 'b1',
      name: 'Test-Board',
      admin_password_hash: 'x',
      promoter_name: 'REWE',
      promoter_logo_key: 'logo-rewe',
      promoter_slogan: 'Mehr Naehe geht nicht.',
    },
    posts: [
      post('p-new', { approved_at: '2026-09-02 12:00:00' }),
      post('p-old', { approved_at: '2026-09-01 08:00:00' }),
      post('p-expired', { expires_at: '2026-08-01T12:00:00.000Z' }),
      post('p-pending', { status: 'pending', approved_at: null, expires_at: null }),
      post('p-rejected', { status: 'rejected', approved_at: null, expires_at: null }),
    ],
    comments: [
      { id: 'c-live', post_id: 'p-new', body: 'Toller Post!', status: 'live', created_at: '2026-09-02 13:00:00' },
      { id: 'c-pending', post_id: 'p-new', body: 'Noch nicht frei.', status: 'pending', created_at: '2026-09-02 13:05:00' },
      { id: 'c-on-pending-post', post_id: 'p-pending', body: 'Auf pending Post.', status: 'live', created_at: '2026-09-02 13:10:00' },
    ] satisfies FakeComment[],
  })
})

function feed(board = 'b1') {
  return app.request(`/api/boards/${board}/feed`, {}, { DB: db } as never)
}

describe('GET /api/boards/{id}/feed', () => {
  it('returns board config with promoter fields and live posts newest first', async () => {
    const res = await feed()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.board).toEqual({
      id: 'b1',
      name: 'Test-Board',
      promoterName: 'REWE',
      promoterLogoKey: 'logo-rewe',
      promoterSlogan: 'Mehr Naehe geht nicht.',
    })
    expect(json.posts.map((p: { id: string }) => p.id)).toEqual(['p-new', 'p-old'])
    expect(json.posts[0].title).toBe('Titel p-new')
  })

  it('never includes expired, pending or rejected posts', async () => {
    const json = await (await feed()).json()
    const ids = json.posts.map((p: { id: string }) => p.id)
    expect(ids).not.toContain('p-expired')
    expect(ids).not.toContain('p-pending')
    expect(ids).not.toContain('p-rejected')
  })

  it('includes only approved comments of live posts', async () => {
    const json = await (await feed()).json()
    const pNew = json.posts.find((p: { id: string }) => p.id === 'p-new')
    expect(pNew.comments.map((c: { id: string }) => c.id)).toEqual(['c-live'])
    expect(pNew.comments[0].body).toBe('Toller Post!')
    expect(json.posts.find((p: { id: string }) => p.id === 'p-old').comments).toEqual([])
  })

  it('returns a German 404 for an unknown board', async () => {
    const res = await feed('nope')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toContain('Brett')
  })

  it('stays small enough for 20-30s polling', async () => {
    const body = await (await feed()).text()
    expect(body.length).toBeLessThan(5000)
  })
})
