import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import app from '../src/index'

const submitHtml = readFileSync(resolve(process.cwd(), 'public/submit.html'), 'utf8')

function envWithAssets() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new Response(req.url.endsWith('/submit.html') ? submitHtml : 'not found', {
          status: req.url.endsWith('/submit.html') ? 200 : 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    },
  }
}

describe('GET /b/{boardId}/neu', () => {
  it('serves the German submit page from the assets binding', async () => {
    const res = await app.request('/b/b1/neu', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('<html lang="de">')
    expect(body).toContain('Kategorie')
    expect(body).toContain('Biete')
    expect(body).toContain('Titel')
    expect(body).toContain('Foto')
    expect(body).toContain('1 Woche')
    expect(body).toContain('2 Wochen')
    expect(body).toContain('Inserat abschicken')
    expect(body).toContain('Vielen Dank! Dein Inserat wird geprüft.')
  })

  it('works for any board id in the path', async () => {
    const res = await app.request('/b/board-42/neu', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
  })
})
