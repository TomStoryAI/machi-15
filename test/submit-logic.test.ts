import { describe, expect, it } from 'vitest'
import { boardIdFromPath, buildPayload, fitImage, managementUrl } from '../public/submit.js'

describe('fitImage', () => {
  it('scales a landscape photo down to maxSide on the long edge', () => {
    expect(fitImage(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('scales a portrait photo down to maxSide on the long edge', () => {
    expect(fitImage(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('leaves photos already within maxSide untouched', () => {
    expect(fitImage(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('boardIdFromPath', () => {
  it('extracts the board id from /b/{id}/neu', () => {
    expect(boardIdFromPath('/b/b1/neu')).toBe('b1')
  })

  it('tolerates a trailing slash', () => {
    expect(boardIdFromPath('/b/b1/neu/')).toBe('b1')
  })

  it('returns null for other paths', () => {
    expect(boardIdFromPath('/api/health')).toBeNull()
    expect(boardIdFromPath('/b/b1')).toBeNull()
  })
})

describe('buildPayload', () => {
  it('builds the API payload with trimmed text and duration as number', () => {
    const payload = buildPayload('b1', {
      category: 'Biete',
      title: '  Gassi gehen  ',
      body: '  Für Hunde.  ',
      durationWeeks: '2',
      contactPhone: '',
      contactEmail: '   ',
    })
    expect(payload).toEqual({
      boardId: 'b1',
      category: 'Biete',
      title: 'Gassi gehen',
      body: 'Für Hunde.',
      durationWeeks: 2,
    })
  })

  it('includes non-empty contact fields', () => {
    const payload = buildPayload('b1', {
      category: 'Suche',
      title: 'Suche',
      body: 'Etwas',
      durationWeeks: '1',
      contactPhone: '0151 123',
      contactInstagram: '  @machi  ',
    })
    expect(payload.contactPhone).toBe('0151 123')
    expect(payload.contactInstagram).toBe('@machi')
  })
})

describe('managementUrl', () => {
  it('builds the poster management link with URL-encoded token', () => {
    expect(managementUrl('https://machi15.com', 'p1', 'tok+en/=')).toBe(
      'https://machi15.com/p/p1?t=tok%2Ben%2F%3D',
    )
  })
})
