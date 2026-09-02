import { describe, expect, it } from 'vitest'
import { boardIdFromPath, frameHtml, submitQrUrl } from '../public/display.js'

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
})

describe('submitQrUrl', () => {
  it('points at the submit page of the board', () => {
    expect(submitQrUrl('https://machi15.com', 'b1')).toBe('https://machi15.com/b/b1/neu')
  })
})
