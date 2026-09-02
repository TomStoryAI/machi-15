import { describe, expect, it } from 'vitest'
import { boardIdFromPath, buildBoardHtml, cellIndexForSlot, frameHtml, qrTileHtml, submitQrUrl } from '../public/display.js'

describe('boardIdFromPath (display)', () => {
  it('extracts the board id from /b/{id}', () => {
    expect(boardIdFromPath('/b/b1')).toBe('b1')
  })

  it('does not match the submit path /b/{id}/neu', () => {
    expect(boardIdFromPath('/b/b1/neu')).toBeNull()
  })

  it('returns null for unrelated paths', () => {
    expect(boardIdFromPath('/api/health')).toBeNull()
  })
})

const basePost = {
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
}

const board = {
  id: 'b1',
  name: 'Test-Board',
  promoterName: 'REWE FAMILIE SCHULZE',
  promoterLogoKey: 'promoter.jpg',
  promoterSlogan: 'Mehr Naehe geht nicht.',
}

describe('frameHtml', () => {
  it('renders title, body, contacts and comment count', () => {
    const html = frameHtml(
      {
        ...basePost,
        contactPhone: '0151 123',
        comments: [{ id: 'c1' }, { id: 'c2' }],
      },
      'b1',
      'https://machi15.com',
    )
    expect(html).toContain('Biete: Gassi gehen')
    expect(html).toContain('Für Hunde in der Nachbarschaft.')
    expect(html).toContain('Tel.: 0151 123')
    expect(html).toContain('2 Kommentare')
  })

  it('uses the singular for one comment and hides the badge for none', () => {
    expect(frameHtml({ ...basePost, comments: [{ id: 'c1' }] }, 'b1', 'https://machi15.com')).toContain('1 Kommentar')
    expect(frameHtml(basePost, 'b1', 'https://machi15.com')).not.toContain('Kommentar')
  })

  it('escapes user text', () => {
    const html = frameHtml({ ...basePost, title: '<script>alert(1)</script>' }, 'b1', 'https://machi15.com')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders a photo only when a photoKey is present', () => {
    expect(frameHtml(basePost, 'b1', 'https://machi15.com')).not.toContain('<img')
    const withPhoto = frameHtml({ ...basePost, photoKey: 'k2' }, 'b1', 'https://machi15.com')
    expect(withPhoto).toContain('<img')
    expect(withPhoto).toContain('/api/photos/k2')
  })

  it('renders a small QR linking to the comment form of the frame', () => {
    const html = frameHtml(basePost, 'b1', 'https://machi15.com')
    expect(html).toContain('<svg')
    expect(html).toContain('/b/b1/p/p1')
    expect(html).toContain('frame-qr')
  })

  it('renders the latest 3 approved comments under the frame', () => {
    const comments = [
      { id: 'c1', body: 'Erster Kommentar.' },
      { id: 'c2', body: 'Zweiter Kommentar.' },
      { id: 'c3', body: 'Dritter Kommentar.' },
      { id: 'c4', body: 'Vierter Kommentar.' },
    ]
    const html = frameHtml({ ...basePost, comments }, 'b1', 'https://machi15.com')
    expect(html).toContain('Zweiter Kommentar.')
    expect(html).toContain('Dritter Kommentar.')
    expect(html).toContain('Vierter Kommentar.')
    expect(html).not.toContain('Erster Kommentar.')
  })

  it('renders no comment list when there are no comments', () => {
    expect(frameHtml(basePost, 'b1', 'https://machi15.com')).not.toContain('frame-comment-list')
  })

  it('escapes comment bodies', () => {
    const html = frameHtml({ ...basePost, comments: [{ id: 'c1', body: '<img src=x onerror=alert(1)>' }] }, 'b1', 'https://machi15.com')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })
})

describe('submitQrUrl', () => {
  it('points at the submit page of the board', () => {
    expect(submitQrUrl('https://machi15.com', 'b1')).toBe('https://machi15.com/b/b1/neu')
  })
})

describe('qrTileHtml', () => {
  it('renders a QR tile encoding the submit URL', () => {
    const html = qrTileHtml('https://machi15.com/b/b1/neu')
    expect(html).toContain('<svg')
    expect(html).toContain('/b/b1/neu')
    expect(html).toContain('tile-qr')
  })
})

describe('buildBoardHtml (9x3 sample board)', () => {
  it('builds 25 cells: 24 tiles + 1 sponsor spanning 3 columns in the middle of row 2', () => {
    const cells = buildBoardHtml([], 'b1', 'https://machi15.com', board)
    expect(cells).toHaveLength(25)
    expect(cells[12]).toContain('sponsor')
    expect(cells[12]).toContain('span 3')
    expect(cells[12]).toContain('/promoter/promoter.jpg')
    expect(cells[12]).toContain('REWE FAMILIE SCHULZE')
    expect(cells[12]).toContain('Mehr Naehe geht nicht.')
    expect(cells.filter((c) => c.includes('tile-qr'))).toHaveLength(24)
  })

  it('renders a post in exactly its slot (slot 7 = row 1, column 7)', () => {
    const cells = buildBoardHtml([{ ...basePost, slot: 7 }], 'b1', 'https://machi15.com', board)
    expect(cells[cellIndexForSlot(7)]).toContain('Biete: Gassi gehen')
    expect(cells[cellIndexForSlot(7)]).not.toContain('tile-qr')
    expect(cells[0].includes('tile-qr')).toBe(true)
  })

  it('maps slots after the sponsor banner correctly (slot 20 -> cell 17)', () => {
    expect(cellIndexForSlot(20)).toBe(17)
    expect(cellIndexForSlot(13)).toBe(-1)
    const cells = buildBoardHtml([{ ...basePost, slot: 20 }], 'b1', 'https://machi15.com', board)
    expect(cells[17]).toContain('Biete: Gassi gehen')
  })

  it('fills remaining free tiles with unslotted posts in feed order', () => {
    const p2 = { ...basePost, id: 'p2', title: 'Suche: Katze', body: 'Entlaufen.' }
    const cells = buildBoardHtml([{ ...basePost, slot: 7 }, p2], 'b1', 'https://machi15.com', board)
    expect(cells[6]).toContain('Biete: Gassi gehen')
    expect(cells[0]).toContain('Suche: Katze')
    expect(cells.filter((c) => c.includes('tile-qr'))).toHaveLength(22)
  })

  it('keeps every QR tile unique, encoding its own slot', () => {
    const cells = buildBoardHtml([], 'b1', 'https://machi15.com', board)
    const qrTiles = cells.filter((c) => c.includes('tile-qr'))
    expect(qrTiles).toHaveLength(24)
    const urls = qrTiles.map((c) => c.match(/>([^<]*)<\/title>/)?.[1])
    expect(new Set(urls).size).toBe(24)
    expect(cells[2]).toContain('?slot=3')
    expect(cells[6]).toContain('?slot=7')
  })

  it('never places a post in the sponsor cells', () => {
    const cells = buildBoardHtml([{ ...basePost, slot: 13 }], 'b1', 'https://machi15.com', board)
    expect(cells[12]).toContain('sponsor')
    expect(cells.some((c) => c.includes('Biete: Gassi gehen'))).toBe(false)
  })

  it('works with more posts than tiles: extra posts are dropped, board stays a QR-first grid', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...basePost, id: `p${i}` }))
    const cells = buildBoardHtml(many, 'b1', 'https://machi15.com', board)
    expect(cells.filter((c) => c.includes('tile-qr'))).toHaveLength(0)
    expect(cells).toHaveLength(25)
  })
})
