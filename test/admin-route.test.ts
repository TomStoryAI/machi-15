import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import app from '../src/index'

const adminHtml = readFileSync(resolve(process.cwd(), 'public/admin.html'), 'utf8')

function envWithAssets() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new Response(req.url.endsWith('/admin.html') ? adminHtml : 'not found', {
          status: req.url.endsWith('/admin.html') ? 200 : 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    },
  }
}

describe('GET /admin/{boardId}', () => {
  it('serves the German admin page from the assets binding', async () => {
    const res = await app.request('/admin/b1', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('<html lang="de">')
    expect(body).toContain('Passwort')
    expect(body).toContain('Anmelden')
    expect(body).toContain('Moderation')
    expect(body).toContain('Ausstehende')
  })

  it('works for any board id in the path', async () => {
    const res = await app.request('/admin/board-42', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
  })
})
