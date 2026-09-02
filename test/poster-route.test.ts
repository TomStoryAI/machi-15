import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import app from '../src/index'

const posterHtml = readFileSync(resolve(process.cwd(), 'public/poster.html'), 'utf8')

function envWithAssets() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new Response(req.url.endsWith('/poster.html') ? posterHtml : 'not found', {
          status: req.url.endsWith('/poster.html') ? 200 : 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    },
  }
}

describe('GET /p/{postId}', () => {
  it('serves the German poster page from the assets binding', async () => {
    const res = await app.request('/p/p1?t=tok', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('<html lang="de">')
    expect(body).toContain('Mein Inserat')
    expect(body).toContain('Inserat löschen')
    expect(body).toContain('Kommentare')
  })
})
