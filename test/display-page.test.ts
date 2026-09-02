// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cellIndexForSlot, initDisplayPage } from '../public/display.js'

const html = readFileSync(resolve(process.cwd(), 'public/display.html'), 'utf8')

const board = {
  id: 'b1',
  name: 'Test-Board',
  promoterName: 'REWE FAMILIE SCHULZE',
  promoterLogoKey: 'promoter.jpg',
  promoterSlogan: 'Mehr Naehe geht nicht.',
}

function post(id: string, title: string, body: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    category: 'Biete',
    title,
    body,
    photoKey: null,
    contactPhone: null,
    contactEmail: null,
    contactWhatsapp: null,
    contactInstagram: null,
    contactAddress: null,
    comments: [],
    ...extra,
  }
}

const feedV1 = {
  board,
  posts: [
    post('p1', 'Biete: Gassi gehen', 'Für Hunde in der Nachbarschaft.', {
      contactPhone: '0151 123',
      comments: [
        { id: 'c1', body: 'Toller Post!' },
        { id: 'c2', body: 'Ja, gerne!' },
      ],
      slot: 7,
    }),
    post('p2', 'Suche: Katze', 'Entlaufen.', { photoKey: 'k2' }),
  ],
}

const feedV2 = { ...feedV1, posts: [...feedV1.posts, post('p3', 'Verkaufe: Fahrrad', 'Gut erhalten.', { slot: 20 })] }

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

function setupPage() {
  document.documentElement.innerHTML = html
  history.replaceState(null, '', '/b/b1')
  localStorage.clear()
}

function gridChildren() {
  return Array.from(document.getElementById('grid')!.children)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  setupPage()
})

describe('display page (9x3 sample board)', () => {
  it('renders the board grid with the sponsor banner in the middle of the middle row', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(feedV1)))
    initDisplayPage()

    const grid = document.getElementById('grid')!
    await vi.waitFor(() => {
      expect(grid.textContent).toContain('Biete: Gassi gehen')
    })

    const cells = gridChildren()
    expect(cells).toHaveLength(25)

    // sponsor: 13th cell (middle of row 2), spanning 3 columns
    const sponsor = cells[12] as HTMLElement
    expect(sponsor.classList.contains('sponsor')).toBe(true)
    expect(sponsor.style.gridColumn).toBe('span 3')
    const logo = sponsor.querySelector('img')!
    expect(logo.getAttribute('src')).toBe('/promoter/promoter.jpg')
    expect(sponsor.textContent).toContain('REWE FAMILIE SCHULZE')
    expect(sponsor.textContent).toContain('Mehr Naehe geht nicht.')

    // slot 7 -> its tile (row 1, column 7); unslotted post fills the first free tile
    expect(cells[cellIndexForSlot(7)].textContent).toContain('Biete: Gassi gehen')
    expect(cells[0].textContent).toContain('Suche: Katze')
    expect(cells.filter((c) => c.querySelector('.tile-qr'))).toHaveLength(22)
    expect(cells[cellIndexForSlot(7)].innerHTML).toContain('/b/b1/p/p1')

    // taken tile content: photo only where photoKey is set
    expect(cells[0].querySelector('img.frame-photo')!.getAttribute('src')).toBe('/api/photos/k2')
    expect(cells[cellIndexForSlot(7)].querySelector('img.frame-photo')).toBeNull()

    // QR tiles encode their unique slot URL
    const qrTile = cells[2]
    expect(qrTile.querySelector('.tile-qr svg')).not.toBeNull()
    expect(qrTile.innerHTML).toContain('/b/b1/neu?slot=3')

    expect(document.getElementById('offline-hint')!.hidden).toBe(true)
  })

  it('shows all tiles as QR codes when no posts are live', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ...feedV1, posts: [] })))
    initDisplayPage()
    const grid = document.getElementById('grid')!
    await vi.waitFor(() => {
      expect(gridChildren().filter((c) => c.querySelector('.tile-qr'))).toHaveLength(24)
    })
    expect(gridChildren()).toHaveLength(25)
  })

  it('picks up a new post on the next poll without reload', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValueOnce(json(feedV1)).mockResolvedValue(json(feedV2))
    vi.stubGlobal('fetch', fetchMock)
    initDisplayPage()

    await vi.advanceTimersByTimeAsync(0)
    const cells = gridChildren()
    expect(cells[cellIndexForSlot(7)].textContent).toContain('Biete: Gassi gehen')
    expect(cells[cellIndexForSlot(20)].querySelector('.tile-qr')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(25_000)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(gridChildren()[cellIndexForSlot(20)].textContent).toContain('Verkaufe: Fahrrad')
    vi.useRealTimers()
  })

  it('renders the cached feed and shows the offline hint when the fetch fails', async () => {
    localStorage.setItem('machiFeed:b1', JSON.stringify(feedV1))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    initDisplayPage()

    expect(gridChildren()[cellIndexForSlot(7)].textContent).toContain('Biete: Gassi gehen')
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

    await vi.advanceTimersByTimeAsync(25_000)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(hint.hidden).toBe(true)
    vi.useRealTimers()
  })

  it('does not render the cached feed of another board', async () => {
    localStorage.setItem('machiFeed:b2', JSON.stringify({ ...feedV1, board: { ...feedV1.board, id: 'b2' } }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    initDisplayPage()
    expect(document.getElementById('grid')!.textContent).not.toContain('Biete: Gassi gehen')
  })
})
