import { describe, expect, it, vi } from 'vitest'
import { adminDb, type FakePost } from './helpers/fake-db'
import { deleteGracedPhotos, expirePosts, handleScheduled } from '../src/expiry'

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

function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 3600 * 1000).toISOString()
}

function seedDb() {
  return adminDb({
    board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' },
    posts: [
      post('p-past', { expires_at: iso(-1) }),
      post('p-future', { expires_at: iso(5) }),
      post('p-pending', { status: 'pending', expires_at: null, approved_at: null }),
      post('p-graced', {
        status: 'expired',
        photo_key: 'key-old',
        expired_at: iso(-31),
        expires_at: iso(-32),
      }),
      post('p-grace-wait', {
        status: 'expired',
        photo_key: 'key-new',
        expired_at: iso(-5),
        expires_at: iso(-6),
      }),
    ],
    comments: [],
  })
}

describe('expirePosts', () => {
  it('expires live posts past expires_at and stamps expired_at', async () => {
    const db = seedDb()
    const n = await expirePosts(db as never)
    expect(n).toBe(1)
    const state = db._state()
    expect(state.posts.find((p) => p.id === 'p-past')!.status).toBe('expired')
    expect(state.posts.find((p) => p.id === 'p-past')!.expired_at).toBeTruthy()
    expect(state.posts.find((p) => p.id === 'p-future')!.status).toBe('live')
    expect(state.posts.find((p) => p.id === 'p-pending')!.status).toBe('pending')
  })
})

describe('deleteGracedPhotos', () => {
  it('D1 path: deletes photo rows of posts expired for 30+ days, keeps fresher ones', async () => {
    const db = seedDb()
    db.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
      .bind('key-old', 'p-graced', 'image/jpeg', 'b2xk')
      .run()
    db.prepare('INSERT INTO photos (key, post_id, content_type, data_base64) VALUES (?, ?, ?, ?)')
      .bind('key-new', 'p-grace-wait', 'image/jpeg', 'bmV3')
      .run()

    const n = await deleteGracedPhotos({ DB: db } as never)
    expect(n).toBe(1)
    const photos = db._state().photos
    expect(photos.map((p) => p.key)).toEqual(['key-new'])
  })

  it('R2 path: deletes the photo keys of graced posts from the bucket', async () => {
    const db = seedDb()
    const deleted: string[] = []
    const r2 = { delete: vi.fn(async (key: string) => { deleted.push(key) }) }

    const n = await deleteGracedPhotos({ DB: db, PHOTOS: r2 } as never)
    expect(n).toBe(1)
    expect(deleted).toEqual(['key-old'])
  })
})

describe('handleScheduled', () => {
  it('runs expiry and photo grace cleanup and returns the counts', async () => {
    const db = seedDb()
    const result = await handleScheduled({ DB: db } as never)
    expect(result.expiredPosts).toBe(1)
    expect(result.deletedPhotos).toBe(1)
    const state = db._state()
    expect(state.posts.find((p) => p.id === 'p-past')!.status).toBe('expired')
  })
})
