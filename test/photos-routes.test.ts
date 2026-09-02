import { beforeAll, describe, expect, it, vi } from 'vitest'
import app from '../src/index'
import { adminDb, type FakePost } from './helpers/fake-db'
import { hashAdminPassword } from '../src/admin'
import { sha256Hex } from '../src/crypto'

const TOKEN = 'secret-token'
let tokenHash: string
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

beforeAll(async () => {
  tokenHash = await sha256Hex(TOKEN)
  db = adminDb({
    board: { id: 'b1', name: 'Test-Board', admin_password_hash: await hashAdminPassword('geheim', { iterations: 1000 }) },
    posts: [
      post('p-live', { photo_key: 'key-live', mgmt_token_hash: tokenHash }),
      post('p-pending', { status: 'pending', approved_at: null, expires_at: null, photo_key: 'key-pending', mgmt_token_hash: tokenHash }),
      post('p-expired', { photo_key: 'key-expired', expires_at: '2026-08-01T12:00:00.000Z', mgmt_token_hash: tokenHash }),
      post('p-no-photo', { mgmt_token_hash: tokenHash }),
    ],
  })
  // D1-path photo rows
  db.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
    .bind('key-live', 'p-live', 'image/jpeg', 'aGVsbG8=')
    .run()
  db.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
    .bind('key-pending', 'p-pending', 'image/jpeg', 'cGVuZGluZw==')
    .run()
  db.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
    .bind('key-expired', 'p-expired', 'image/jpeg', 'ZXhwaXJlZA==')
    .run()
})

function upload(postId: string, token: string | null, file?: File) {
  const fd = new FormData()
  fd.set('photo', file ?? new File(['fake-image-bytes'], 'foto.jpg', { type: 'image/jpeg' }))
  const q = token ? `?t=${encodeURIComponent(token)}` : ''
  return app.request(`/api/posts/${postId}/photo${q}`, { method: 'POST', body: fd }, { DB: db } as never)
}

function getPhoto(key: string, opts: { token?: string; bearer?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`
  const q = opts.token ? `?t=${encodeURIComponent(opts.token)}` : ''
  return app.request(`/api/photos/${key}${q}`, { headers }, { DB: db } as never)
}

describe('POST /api/posts/{id}/photo', () => {
  it('stores a photo and sets photo_key on the post for the correct token', async () => {
    const res = await upload('p-no-photo', TOKEN)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.photoKey).toBeTruthy()
    const post = db._state().posts.find((p) => p.id === 'p-no-photo')!
    expect(post.photo_key).toBe(json.photoKey)
  })

  it('returns 404 for a wrong token and stores nothing', async () => {
    const before = db._state().posts.find((p) => p.id === 'p-no-photo')!.photo_key
    const res = await upload('p-no-photo', 'falsch')
    expect(res.status).toBe(404)
    expect(db._state().posts.find((p) => p.id === 'p-no-photo')!.photo_key).toBe(before)
  })

  it('returns 404 without a token', async () => {
    expect((await upload('p-no-photo', null)).status).toBe(404)
  })

  it('rejects non-image uploads with a German 400', async () => {
    const res = await upload('p-no-photo', TOKEN, new File(['x'], 'foto.txt', { type: 'text/plain' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Bild')
  })

  it('rejects oversized uploads with a German 400', async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'foto.jpg', { type: 'image/jpeg' })
    const res = await upload('p-no-photo', TOKEN, big)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('groß')
  })
})

describe('GET /api/photos/{key}', () => {
  it('serves a live post photo publicly with the right content type', async () => {
    const res = await getPhoto('key-live')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('hello')
  })

  it('hides a pending post photo from the public with 404', async () => {
    expect((await getPhoto('key-pending')).status).toBe(404)
  })

  it('shows a pending photo to the poster with the management token', async () => {
    const res = await getPhoto('key-pending', { token: TOKEN })
    expect(res.status).toBe(200)
  })

  it('shows a pending photo to the admin with a session', async () => {
    const login = await app.request(
      '/api/admin/b1/login',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'geheim' }) },
      { DB: db } as never,
    )
    const adminToken = (await login.json()).token
    const res = await getPhoto('key-pending', { bearer: adminToken })
    expect(res.status).toBe(200)
  })

  it('hides an expired post photo from the public', async () => {
    expect((await getPhoto('key-expired')).status).toBe(404)
  })

  it('returns 404 for an unknown key and a wrong token', async () => {
    expect((await getPhoto('unbekannt')).status).toBe(404)
    expect((await getPhoto('key-pending', { token: 'falsch' })).status).toBe(404)
  })
})

describe('R2 path (binding present)', () => {
  it('stores in R2 instead of D1 when the PHOTOS binding exists', async () => {
    const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>()
    const r2 = {
      put: vi.fn(async (key: string, value: ArrayBuffer, opts: { httpMetadata?: { contentType?: string } }) => {
        stored.set(key, { bytes: new Uint8Array(value), contentType: opts.httpMetadata?.contentType })
      }),
      get: vi.fn(async (key: string) => {
        const item = stored.get(key)
        if (!item) return null
        return { arrayBuffer: async () => item.bytes.buffer, httpMetadata: { contentType: item.contentType } }
      }),
    }
    const res = await app.request(
      `/api/posts/p-no-photo/photo?t=${TOKEN}`,
      { method: 'POST', body: (() => { const fd = new FormData(); fd.set('photo', new File(['r2-bytes'], 'foto.jpg', { type: 'image/jpeg' })); return fd })(), },
      { DB: db, PHOTOS: r2 } as never,
    )
    expect(res.status).toBe(201)
    expect(r2.put).toHaveBeenCalledTimes(1)
    const photoKey = (await res.json()).photoKey
    const served = await app.request(`/api/photos/${photoKey}`, {}, { DB: db, PHOTOS: r2 } as never)
    // wait: the post is live -> public
    expect(served.status).toBe(200)
    expect(Buffer.from(await served.arrayBuffer()).toString()).toBe('r2-bytes')
    expect(db._state().posts.find((p) => p.id === 'p-no-photo')!.photo_key).toBe(photoKey)
  })
})
