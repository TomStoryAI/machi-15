import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import app from '../src/index'

const commentHtml = readFileSync(resolve(process.cwd(), 'public/comment.html'), 'utf8')

function envWithAssets() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new Response(req.url.endsWith('/comment.html') ? commentHtml : 'not found', {
          status: req.url.endsWith('/comment.html') ? 200 : 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    },
  }
}

describe('GET /b/{boardId}/p/{postId}', () => {
  it('serves the German comment form page from the assets binding', async () => {
    const res = await app.request('/b/b1/p/p1', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('<html lang="de">')
    expect(body).toContain('Kommentar')
    expect(body).toContain('Abschicken')
    expect(body).toContain('Vielen Dank! Dein Kommentar wird geprüft.')
  })
})
