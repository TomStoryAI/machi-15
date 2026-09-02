import { describe, expect, it } from 'vitest'
import app from '../src/index'
import { CATEGORIES, validatePostInput } from '../src/posts'
import { generateToken, sha256Hex } from '../src/crypto'

const validPost = {
  boardId: 'b1',
  category: 'Biete',
  title: 'Biete: Gassi gehen',
  body: 'Für Hunde in der Nachbarschaft.',
  durationWeeks: 1,
}

function fakeDb(opts: { recentCount?: number; boardExists?: boolean } = {}) {
  const calls: { query: string; bound: unknown[] }[] = []
  let currentQuery = ''
  const stmt = {
    bind: (...args: unknown[]) => {
      calls.push({ query: currentQuery, bound: args })
      return stmt
    },
    first: async () => {
      if (currentQuery.includes('FROM boards')) {
        return opts.boardExists === false ? null : { id: 'b1' }
      }
      return { n: opts.recentCount ?? 0 }
    },
    run: async () => ({ meta: { last_row_id: 1 } }),
  }
  const db = {
    prepare: (q: string) => {
      currentQuery = q
      calls.push({ query: q, bound: [] })
      return stmt
    },
    calls,
  }
  return db
}

describe('validatePostInput', () => {
  it('accepts a valid text-only post', () => {
    const r = validatePostInput(validPost)
    expect(r.ok).toBe(true)
  })

  it('rejects missing title', () => {
    const r = validatePostInput({ ...validPost, title: '  ' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Titel')
  })

  it('rejects missing body', () => {
    const r = validatePostInput({ ...validPost, body: '' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Text')
  })

  it('rejects unknown category', () => {
    const r = validatePostInput({ ...validPost, category: 'Krypto-Scam' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Kategorie')
  })

  it('rejects duration other than 1 or 2 weeks', () => {
    const r = validatePostInput({ ...validPost, durationWeeks: 3 })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('Laufzeit')
  })

  it('rejects oversized title and body', () => {
    const r = validatePostInput({ ...validPost, title: 'x'.repeat(200), body: 'x'.repeat(2000) })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('zu lang')
  })
})

describe('crypto helpers', () => {
  it('generates tokens that hash to 64 hex chars and differ from the token', async () => {
    const token = generateToken()
    const hash = await sha256Hex(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toBe(token)
  })
})

describe('POST /api/posts', () => {
  it('creates a pending post and returns postId + mgmtToken', async () => {
    const db = fakeDb()
    const res = await app.request(
      '/api/posts',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validPost) },
      { DB: db } as never,
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.postId).toBeTruthy()
    expect(json.mgmtToken).toBeTruthy()
  })

  it('rejects posts for a nonexistent board with a German 400', async () => {
    const res = await app.request(
      '/api/posts',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validPost) },
      { DB: fakeDb({ boardExists: false }) } as never,
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Brett')
  })

  it('rejects invalid input with a German 400', async () => {
    const res = await app.request(
      '/api/posts',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...validPost, title: '' }) },
      { DB: fakeDb() } as never,
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Titel')
  })

  it('rate limits: 4th post within an hour gets a friendly 429', async () => {
    const res = await app.request(
      '/api/posts',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validPost) },
      { DB: fakeDb({ recentCount: 3 }) } as never,
    )
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toContain('Stunde')
  })
})

describe('CATEGORIES', () => {
  it('contains the default category list', () => {
    expect(CATEGORIES).toEqual(['Biete', 'Suche', 'Verkaufen', 'Veranstaltungen', 'Sonstiges'])
  })
})
