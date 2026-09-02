// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initSubmitPage, qrSvg, resizePhotoFile } from '../public/submit.js'

const html = readFileSync(resolve(process.cwd(), 'public/submit.html'), 'utf8')

function setupPage() {
  document.documentElement.innerHTML = html
  history.replaceState(null, '', '/b/b1/neu')
  initSubmitPage()
}

function fillForm() {
  const category = document.getElementById('category') as HTMLSelectElement
  const title = document.getElementById('title') as HTMLInputElement
  const body = document.getElementById('body') as HTMLTextAreaElement
  category.value = 'Biete'
  title.value = 'Biete: Gassi gehen'
  body.value = 'Für Hunde in der Nachbarschaft.'
  const form = document.getElementById('submit-form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function getFetch() {
  return fetch as ReturnType<typeof vi.fn>
}

beforeEach(() => {
  setupPage()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('submit page form', () => {
  it('POSTs the form to /api/posts and shows the confirmation with management link and QR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(201, { postId: 'p1', mgmtToken: 'tok' })))
    fillForm()

    const formSection = document.getElementById('form-section')!
    const confirmation = document.getElementById('confirmation')!
    await vi.waitFor(() => {
      expect(formSection.hidden).toBe(true)
    })

    const [url, init] = getFetch().mock.calls[0]
    expect(url).toBe('/api/posts')
    expect(init.method).toBe('POST')
    const payload = JSON.parse(init.body)
    expect(payload).toMatchObject({
      boardId: 'b1',
      category: 'Biete',
      title: 'Biete: Gassi gehen',
      durationWeeks: 2,
    })

    expect(confirmation.hidden).toBe(false)
    expect(confirmation.textContent).toContain('Vielen Dank! Dein Inserat wird geprüft.')

    const link = document.getElementById('mgmt-link') as HTMLAnchorElement
    expect(link.href).toBe(`${location.origin}/p/p1?t=tok`)
    expect(link.textContent).toBe(`${location.origin}/p/p1?t=tok`)

    const qrBox = document.getElementById('mgmt-qr')!
    expect(qrBox.innerHTML).toContain('<svg')
    // the QR encodes the management link; the SVG carries it as its accessible title
    expect(qrBox.innerHTML).toContain('<title')
    expect(qrBox.innerHTML).toContain(`/p/p1?t=tok`)
  })

  it('shows the German server error and keeps the form visible on a 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: 'Bitte gib einen Titel an.' })))
    fillForm()

    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })

    expect(error.textContent).toContain('Bitte gib einen Titel an.')
    expect(document.getElementById('form-section')!.hidden).toBe(false)
    expect(document.getElementById('confirmation')!.hidden).toBe(true)
  })

  it('retries once on network failure and shows a friendly message if it still fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    )
    fillForm()

    const error = document.getElementById('error')!
    await vi.waitFor(() => {
      expect(error.hidden).toBe(false)
    })
    expect(getFetch()).toHaveBeenCalledTimes(2)
    expect(error.textContent).toContain('Netzwerk')
  })

  it('succeeds after the first attempt fails on the network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(jsonResponse(201, { postId: 'p2', mgmtToken: 't2' })),
    )
    fillForm()

    const confirmation = document.getElementById('confirmation')!
    await vi.waitFor(() => {
      expect(confirmation.hidden).toBe(false)
    })
    expect(getFetch()).toHaveBeenCalledTimes(2)
    expect((document.getElementById('mgmt-link') as HTMLAnchorElement).href).toBe(`${location.origin}/p/p2?t=t2`)
  })
})

describe('photo resize', () => {
  it('resizes a photo larger than 1600px down to 1600px on the long edge via canvas', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4032, height: 3024, close: vi.fn() }))

    let capturedCanvas: HTMLCanvasElement | null = null
    let drawArgs: unknown[] = []
    HTMLCanvasElement.prototype.getContext = function () {
      capturedCanvas = this
      return {
        drawImage: (...args: unknown[]) => {
          drawArgs = args
        },
      } as unknown as CanvasRenderingContext2D
    }
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      cb(new Blob(['x'], { type: 'image/jpeg' }))
    }

    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    const result = await resizePhotoFile(file)

    expect(result).toBeInstanceOf(Blob)
    expect(capturedCanvas).not.toBeNull()
    expect(capturedCanvas!.width).toBe(1600)
    expect(capturedCanvas!.height).toBe(1200)
    expect(drawArgs).toHaveLength(5)
    expect(drawArgs[1]).toBe(0)
    expect(drawArgs[2]).toBe(0)
    expect(drawArgs[3]).toBe(1600)
    expect(drawArgs[4]).toBe(1200)
  })

  it('passes small photos through untouched', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }))
    const file = new File(['x'], 'klein.jpg', { type: 'image/jpeg' })
    expect(await resizePhotoFile(file)).toBe(file)
  })
})

describe('qrSvg', () => {
  it('renders an SVG QR code for the given text', () => {
    const svg = qrSvg('https://machi15.com/p/p1?t=tok')
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox')
  })
})
