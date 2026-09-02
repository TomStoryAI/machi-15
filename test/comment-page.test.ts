// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initCommentPage } from '../public/comment.js'

const html = readFileSync(resolve(process.cwd(), 'public/comment.html'), 'utf8')

const feed = {
  board: { id: 'b1', name: 'Test-Board', promoterName: null, promoterLogoKey: null, promoterSlogan: null },
  posts: [
    {
      id: 'p1',
      category: 'Biete',
      title: 'Biete: Gassi gehen',
      body: 'Für Hunde in der Nachbarschaft.',
      photoKey: null,
      contactPhone: null,
      contactEmail: null,
      contactWhatsapp: null,
      contactInstagram: null,
      contactAddress: null,
      comments: [],
    },
  ],
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function setupPage() {
  document.documentElement.innerHTML = html
  history.replaceState(null, '', '/b/b1/p/p1')
}

function fillAndSubmit(body = 'Toller Post!') {
  const input = document.getElementById('comment-body') as HTMLTextAreaElement
  input.value = body
  document.getElementById('comment-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function getFetch() {
  return fetch as ReturnType<typeof vi.fn>
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  setupPage()
})

describe('comment page', () => {
  it('renders the post and submits a comment, then shows the confirmation', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/feed')) return Promise.resolve(json(200, feed))
      return Promise.resolve(json(201, { commentId: 'c1' }))
    })
    vi.stubGlobal('fetch', fetchMock)
    initCommentPage()

    const postBox = document.getElementById('post-box')!
    await vi.waitFor(() => {
      expect(postBox.textContent).toContain('Biete: Gassi gehen')
    })
    expect(postBox.textContent).toContain('Für Hunde in der Nachbarschaft.')

    fillAndSubmit()
    const confirmation = document.getElementById('confirmation')!
    await vi.waitFor(() => {
      expect(confirmation.hidden).toBe(false)
    })

    const commentCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/comments'))!
    expect(commentCall[0]).toBe('/api/posts/p1/comments')
    expect(JSON.parse(commentCall[1].body)).toEqual({ body: 'Toller Post!' })
    expect(confirmation.textContent).toContain('Vielen Dank! Dein Kommentar wird geprüft.')
    expect(document.getElementById('form-section')!.hidden).toBe(true)
  })

  it('shows the German server error and keeps the form on a 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        url.endsWith('/feed')
          ? Promise.resolve(json(200, feed))
          : Promise.resolve(json(400, { error: 'Bitte gib einen Kommentar ein.' })),
      ),
    )
    initCommentPage()
    await vi.waitFor(() => {
      expect(document.getElementById('post-box')!.textContent).toContain('Biete: Gassi gehen')
    })

    fillAndSubmit()
    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })
    expect(error.textContent).toContain('Bitte gib einen Kommentar ein.')
    expect(document.getElementById('form-section')!.hidden).toBe(false)
  })

  it('shows not-found when the post is not in the live feed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { ...feed, posts: [] })))
    initCommentPage()

    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })
    expect(error.textContent).toContain('Inserat nicht gefunden')
    expect(document.getElementById('form-section')!.hidden).toBe(true)
  })

  it('shows a network error when the feed cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    initCommentPage()

    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })
    expect(error.textContent).toContain('Netzwerk')
  })
})
