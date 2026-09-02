import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import app from '../src/index'

const displayHtml = readFileSync(resolve(process.cwd(), 'public/display.html'), 'utf8')
const submitHtml = readFileSync(resolve(process.cwd(), 'public/submit.html'), 'utf8')

function envWithAssets() {
  const pages: Record<string, string> = { '/display.html': displayHtml, '/submit.html': submitHtml }
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const page = pages[new URL(req.url).pathname]
        return new Response(page ?? 'not found', {
          status: page ? 200 : 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      },
    },
  }
}

describe('GET /b/{boardId}', () => {
  it('serves the German display page from the assets binding', async () => {
    const res = await app.request('/b/b1', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('<html lang="de">')
    expect(body).toContain('Machi-Board (Display)')
    expect(body).toContain('Starte hier Dein kostenloses Inserat!')
    expect(body).toContain('id="frames"')
  })

  it('still routes /b/{boardId}/neu to the submit page', async () => {
    const res = await app.request('/b/b1/neu', {}, envWithAssets() as never)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Inserat abschicken')
  })
})
