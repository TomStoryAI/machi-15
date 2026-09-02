import { describe, expect, it } from 'vitest'
import app from '../src/index'
import { adminDb } from './helpers/fake-db'
import { validatePostInput } from '../src/posts'

describe('validatePostInput slots', () => {
  const valid = { boardId: 'b1', category: 'Biete', title: 'T', body: 'B', durationWeeks: 1 }

  it('accepts a valid slot (row 1, column 7 -> slot 7)', () => {
    const r = validatePostInput({ ...valid, slot: 7 })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.slot).toBe(7)
  })

  it('accepts a missing slot (legacy flow)', () => {
    expect(validatePostInput(valid).ok).toBe(true)
  })

  it('rejects slots outside 1-27 with a German error', () => {
    for (const slot of [0, 28, -1]) {
      const r = validatePostInput({ ...valid, slot })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('Feld')
    }
  })

  it('rejects the sponsor cells 13-15', () => {
    for (const slot of [13, 14, 15]) {
      const r = validatePostInput({ ...valid, slot })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('Feld')
    }
  })

  it('rejects a non-numeric slot', () => {
    const r = validatePostInput({ ...valid, slot: 'sieben' })
    expect(r.ok).toBe(false)
  })
})

describe('POST /api/posts with slot', () => {
  const valid = { boardId: 'b1', category: 'Biete', title: 'Foto im Feld 7', body: 'Text', durationWeeks: 1, slot: 7 }

  function create(db: ReturnType<typeof adminDb>, body = valid) {
    return app.request(
      '/api/posts',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      { DB: db } as never,
    )
  }

  it('stores the post with its slot when the tile is free', async () => {
    const db = adminDb({ board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' } })
    const res = await create(db)
    expect(res.status).toBe(201)
    const stored = db._state().posts[0]
    expect(stored.slot).toBe(7)
  })

  it('rejects an occupied tile with a friendly German 409', async () => {
    const db = adminDb({
      board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' },
      posts: [
        {
          id: 'taken',
          board_id: 'b1',
          category: 'Biete',
          title: 'Belegt',
          body: 'x',
          photo_key: null,
          contact_phone: null,
          contact_email: null,
          contact_whatsapp: null,
          contact_instagram: null,
          contact_address: null,
          duration_weeks: 1,
          status: 'live',
          expires_at: '2026-09-16T12:00:00.000Z',
          approved_at: null,
          created_at: 'x',
          slot: 7,
        },
      ],
    })
    const res = await create(db)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('belegt')
  })

  it('returns 409 when the same slot is pending', async () => {
    const db = adminDb({
      board: { id: 'b1', name: 'Test-Board', admin_password_hash: 'x' },
      posts: [
        {
          id: 'reserved',
          board_id: 'b1',
          category: 'Biete',
          title: 'Reserviert',
          body: 'x',
          photo_key: null,
          contact_phone: null,
          contact_email: null,
          contact_whatsapp: null,
          contact_instagram: null,
          contact_address: null,
          duration_weeks: 1,
          status: 'pending',
          expires_at: null,
          approved_at: null,
          created_at: 'x',
          slot: 7,
        },
      ],
    })
    const res = await create(db)
    expect(res.status).toBe(409)
  })
})
