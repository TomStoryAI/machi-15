import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const pub = (f: string) => resolve(process.cwd(), 'public', f)

describe('legal pages', () => {
  it('ships a German Impressum with a visible operator placeholder', () => {
    expect(existsSync(pub('impressum.html'))).toBe(true)
    const html = readFileSync(pub('impressum.html'), 'utf8')
    expect(html).toContain('<html lang="de">')
    expect(html).toContain('Impressum')
    expect(html).toContain('PLATZHALTER')
  })

  it('ships a German Datenschutz page with a visible operator placeholder', () => {
    expect(existsSync(pub('datenschutz.html'))).toBe(true)
    const html = readFileSync(pub('datenschutz.html'), 'utf8')
    expect(html).toContain('<html lang="de">')
    expect(html).toContain('Datenschutz')
    expect(html).toContain('PLATZHALTER')
  })

  it('is linked from every public page', () => {
    for (const f of ['submit.html', 'display.html', 'comment.html', 'poster.html']) {
      const html = readFileSync(pub(f), 'utf8')
      expect(html, f).toContain('href="/impressum"')
      expect(html, f).toContain('href="/datenschutz"')
    }
  })
})
