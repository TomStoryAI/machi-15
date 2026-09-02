import { describe, expect, it } from 'vitest'
import { boardIdFromPath, buildBoardHtml, frameHtml, qrTileHtml, submitQrUrl } from '../public/display.js'

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

  it('fills taken tiles with live posts in feed order', () => {
    const p2 = { ...basePost, id: 'p2', title: 'Suche: Katze', body: 'Entlaufen.' }
    const cells = buildBoardHtml([basePost, p2], 'b1', 'https://machi15.com', board)
    expect(cells[0]).toContain('Biete: Gassi gehen')
    expect(cells[1]).toContain('Suche: Katze')
    // taken tiles still carry their comment QR
    expect(cells[0]).toContain('/b/b1/p/p1')
    expect(cells.filter((c) => c.includes('tile-qr'))).toHaveLength(22)
  })

  it('keeps QR tiles scannable to the submit page', () => {
    const cells = buildBoardHtml([], 'b1', 'https://machi15.com', board)
    for (const c of cells) {
      if (c.includes('tile-qr')) expect(c).toContain('/b/b1/neu')
    }
  })

  it('works with more posts than tiles: extra posts are dropped, board stays a QR-first grid', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...basePost, id: `p${i}` }))
    const cells = buildBoardHtml(many, 'b1', 'https://machi15.com', board)
    expect(cells.filter((c) => c.includes('tile-qr'))).toHaveLength(0)
    expect(cells).toHaveLength(25)
  })
})
