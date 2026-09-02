// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initPosterPage } from '../public/poster.js'

const html = readFileSync(resolve(process.cwd(), 'public/poster.html'), 'utf8')

const postData = {
  id: 'p1',
  category: 'Biete',
  title: 'Biete: Gassi gehen',
  body: 'Für Hunde in der Nachbarschaft.',
  photoKey: null,
  contactPhone: '0151 123',
  contactEmail: null,
  contactWhatsapp: null,
  contactInstagram: null,
  contactAddress: null,
  durationWeeks: 1,
  createdAt: '2026-09-02 10:00:00',
  approvedAt: '2026-09-02 12:00:00',
  status: 'live',
  comments: [{ id: 'c1', body: 'Toller Post!', createdAt: '2026-09-02 13:00:00' }],
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function setupPage(path = '/p/p1?t=tok') {
  document.documentElement.innerHTML = html
  const url = new URL(`https://machi15.com${path}`)
  history.replaceState(null, '', url.pathname + url.search)
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

describe('poster page', () => {
  it('renders status, ad details and approved comments with the token from the URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, postData)))
    initPosterPage()

    const statusBox = document.getElementById('status-box')!
    await vi.waitFor(() => {
      expect(statusBox.textContent).toContain('Dein Inserat ist live.')
    })
    expect(getFetch().mock.calls[0][0]).toBe('/api/posts/p1?t=tok')

    const adBox = document.getElementById('ad-box')!
    expect(adBox.textContent).toContain('Biete: Gassi gehen')
    expect(adBox.textContent).toContain('Für Hunde in der Nachbarschaft.')
    expect(adBox.textContent).toContain('Tel.: 0151 123')

    const commentsBox = document.getElementById('comments-box')!
    expect(commentsBox.textContent).toContain('Toller Post!')
    expect(document.getElementById('delete-btn')!.hidden).toBe(false)
  })

  it('shows the pending status and hides the delete button after deletion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(200, { ...postData, status: 'pending', comments: [] })),
    )
    initPosterPage()
    await vi.waitFor(() => {
      expect(document.getElementById('status-box')!.textContent).toContain('wird geprüft')
    })
    expect(document.getElementById('comments-box')!.textContent).toContain('Noch keine Kommentare.')
  })

  it('shows a rejected status without a delete button', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { ...postData, status: 'rejected' })))
    initPosterPage()
    await vi.waitFor(() => {
      expect(document.getElementById('status-box')!.textContent).toContain('abgelehnt')
    })
    expect(document.getElementById('delete-btn')!.hidden).toBe(true)
  })

  it('deletes after confirmation and then shows the deleted state', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, postData))
      .mockResolvedValueOnce(json(200, { ok: true }))
      .mockResolvedValue(json(200, { ...postData, status: 'deleted' }))
    vi.stubGlobal('fetch', fetchMock)
    initPosterPage()
    await vi.waitFor(() => {
      expect(document.getElementById('status-box')!.textContent).toContain('live')
    })

    document.getElementById('delete-btn')!.click()

    await vi.waitFor(() => {
      expect(document.getElementById('status-box')!.textContent).toContain('gelöscht')
    })
    const deleteCall = fetchMock.mock.calls.find(([url, init]) => url === '/api/posts/p1?t=tok' && init?.method === 'DELETE')!
    expect(deleteCall).toBeTruthy()
    expect(document.getElementById('delete-btn')!.hidden).toBe(true)
  })

  it('does not delete when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, postData)))
    initPosterPage()
    await vi.waitFor(() => {
      expect(document.getElementById('status-box')!.textContent).toContain('live')
    })

    document.getElementById('delete-btn')!.click()
    await vi.waitFor(() => {
      expect(getFetch()).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a generic message for a 404 without leaking details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { error: 'Inserat nicht gefunden.' })))
    initPosterPage()

    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })
    expect(error.textContent).toContain('Link ist ungültig')
    expect(document.getElementById('status-box')!.hidden).toBe(true)
  })
})
