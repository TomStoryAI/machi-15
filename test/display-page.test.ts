// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initDisplayPage } from '../public/display.js'

const html = readFileSync(resolve(process.cwd(), 'public/display.html'), 'utf8')

const feedV1 = {
  board: { id: 'b1', name: 'Test-Board', promoterName: 'REWE', promoterLogoKey: null, promoterSlogan: 'Mehr Naehe geht nicht.' },
  posts: [
    {
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
      comments: [{ id: 'c1' }, { id: 'c2' }],
    },
    {
      id: 'p2',
      category: 'Suche',
      title: 'Suche: Katze',
      body: 'Entlaufen.',
      photoKey: 'k2',
      contactPhone: null,
      contactEmail: null,
      contactWhatsapp: null,
      contactInstagram: null,
      contactAddress: null,
      comments: [],
    },
  ],
}

const feedV2 = {
  ...feedV1,
  posts: [
    ...feedV1.posts,
    {
      id: 'p3',
      category: 'Verkaufen',
      title: 'Verkaufe: Fahrrad',
      body: 'Gut erhalten.',
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

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

function setupPage() {
  document.documentElement.innerHTML = html
  history.replaceState(null, '', '/b/b1')
  localStorage.clear()
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  setupPage()
})

describe('display page', () => {
  it('renders frames, QR tile and promoter tile from the feed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(feedV1)))
    initDisplayPage()

    const frames = document.getElementById('frames')!
    await vi.waitFor(() => {
      expect(frames.textContent).toContain('Biete: Gassi gehen')
    })
    expect(frames.textContent).toContain('Für Hunde in der Nachbarschaft.')
    expect(frames.textContent).toContain('Tel.: 0151 123')
    expect(frames.textContent).toContain('2 Kommentare')
    expect(frames.textContent).toContain('Suche: Katze')
    // photo img only for the post with a photoKey
    const imgs = frames.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0].getAttribute('src')).toBe('/api/photos/k2')

    // each frame carries a small QR to its comment form
    expect(frames.innerHTML).toContain('/b/b1/p/p1')
    expect(frames.innerHTML).toContain('/b/b1/p/p2')

    const qrBox = document.getElementById('qr-box')!
    expect(qrBox.innerHTML).toContain('<svg')
    expect(qrBox.innerHTML).toContain('/b/b1/neu')
    expect(document.getElementById('qr-tile')!.textContent).toContain('Starte hier Dein kostenloses Inserat!')

    const promoter = document.getElementById('promoter-tile')!
    expect(promoter.textContent).toContain('REWE')
    expect(promoter.textContent).toContain('Mehr Naehe geht nicht.')

    expect(document.getElementById('offline-hint')!.hidden).toBe(true)
  })

  it('shows an empty state when no posts are live', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...feedV1, posts: [] })))
    initDisplayPage()
    const frames = document.getElementById('frames')!
    await vi.waitFor(() => {
      expect(frames.textContent).toContain('Noch keine Inserate')
    })
  })

  it('picks up a new post on the next poll without reload', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValueOnce(json(feedV1)).mockResolvedValue(json(feedV2))
    vi.stubGlobal('fetch', fetchMock)
    initDisplayPage()

    await vi.advanceTimersByTimeAsync(0)
    const frames = document.getElementById('frames')!
    expect(frames.textContent).toContain('Biete: Gassi gehen')
    expect(frames.textContent).not.toContain('Verkaufe: Fahrrad')

    await vi.advanceTimersByTimeAsync(25_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(frames.textContent).toContain('Verkaufe: Fahrrad')
    vi.useRealTimers()
  })

  it('renders the cached feed and shows the offline hint when the fetch fails', async () => {
    localStorage.setItem('machiFeed:b1', JSON.stringify(feedV1))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    initDisplayPage()

    // cached feed renders synchronously
    expect(document.getElementById('frames')!.textContent).toContain('Biete: Gassi gehen')
    const hint = document.getElementById('offline-hint')!
    await vi.waitFor(() => {
      expect(hint.hidden).toBe(false)
    })
    expect(hint.textContent).toContain('Offline')
  })

  it('hides the offline hint once the feed is reachable again', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(json(feedV1))
    vi.stubGlobal('fetch', fetchMock)
    initDisplayPage()

    await vi.advanceTimersByTimeAsync(0)
    const hint = document.getElementById('offline-hint')!
    expect(hint.hidden).toBe(false)

    // the running poll interval retries automatically
    await vi.advanceTimersByTimeAsync(25_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(hint.hidden).toBe(true)
    vi.useRealTimers()
  })

  it('does not cache the feed of another board', async () => {
    localStorage.setItem('machiFeed:b2', JSON.stringify({ ...feedV1, board: { ...feedV1.board, id: 'b2' } }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    initDisplayPage()
    expect(document.getElementById('frames')!.textContent).toBe('')
  })
})
