import { describe, expect, it } from 'vitest'
import app from '../src/index'

describe('GET /api/health', () => {
  it('responds 200 with ok:true', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
