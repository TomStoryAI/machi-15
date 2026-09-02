// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initAdminPage } from '../public/admin.js'

const html = readFileSync(resolve(process.cwd(), 'public/admin.html'), 'utf8')

const pendingBody = {
  posts: [
    { id: 'post-1', category: 'Biete', title: 'Biete: Gassi gehen', body: 'Für Hunde.', photoKey: null, contactPhone: null, contactEmail: null, contactWhatsapp: null, contactInstagram: null, contactAddress: null, durationWeeks: 1, createdAt: '2026-09-02 10:00:00' },
  ],
  comments: [{ id: 'comment-1', postId: 'post-1', postTitle: 'Biete: Gassi gehen', body: 'Toller Post!', createdAt: '2026-09-02 10:05:00' }],
}
const liveBody = {
  posts: [
    { id: 'post-2', category: 'Suche', title: 'Suche: Katze', body: 'Entlaufen.', photoKey: 'k2', contactPhone: null, contactEmail: null, contactWhatsapp: null, contactInstagram: null, contactAddress: null, durationWeeks: 2, createdAt: '2026-09-01 10:00:00' },
  ],
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// A fetch stub that routes like the real worker: login + authed list/action endpoints.
function stubApi(overrides: { onAction?: (url: string, init: RequestInit) => void } = {}) {
  const calls: { url: string; init: RequestInit }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init })
      if (url.endsWith('/login')) {
        const { password } = JSON.parse(init.body as string)
        if (password === 'geheim') return json(200, { token: 'tok', expiresAt: new Date(Date.now() + 864e5).toISOString() })
        return json(401, { error: 'Anmeldung fehlgeschlagen.' })
      }
      if (url.includes('/api/photos/')) {
        return new Response('foto-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } })
      }
      if (!init.headers || !String(init.headers.authorization).startsWith('Bearer ')) {
        return json(401, { error: 'Sitzung abgelaufen. Bitte erneut anmelden.' })
      }
      if (url.endsWith('/pending')) return json(200, pendingBody)
      if (url.endsWith('/live')) return json(200, liveBody)
      if (url.includes('/approve') || url.includes('/reject') || init.method === 'DELETE') {
        overrides.onAction?.(url, init)
        return json(200, { ok: true })
      }
      return json(404, { error: 'unbekannt' })
    }),
  )
  return calls
}

function setupPage() {
  document.documentElement.innerHTML = html
  history.replaceState(null, '', '/admin/b1')
  sessionStorage.clear()
  URL.createObjectURL = ((blob: Blob) => `blob:fake-${blob.size}`) as typeof URL.createObjectURL
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL
}

function fillAndSubmitLogin(password = 'geheim') {
  const input = document.getElementById('password') as HTMLInputElement
  input.value = password
  document.getElementById('login-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

async function waitVisible(id: string) {
  await vi.waitFor(() => {
    const el = document.getElementById(id)!
    expect(el.hidden).toBe(false)
  })
  return document.getElementById(id)!
}

beforeEach(() => {
  setupPage()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('admin page', () => {
  it('shows the login form when no session exists', () => {
    initAdminPage()
    expect(document.getElementById('login-section')!.hidden).toBe(false)
    expect(document.getElementById('queue-section')!.hidden).toBe(true)
  })

  it('logs in, stores the token and renders pending posts with approve/reject buttons', async () => {
    const calls = stubApi()
    initAdminPage()
    fillAndSubmitLogin()

    await waitVisible('queue-section')

    const loginCall = calls.find((c) => c.url.endsWith('/login'))!
    expect(JSON.parse(loginCall.init.body as string)).toEqual({ password: 'geheim' })
    expect(sessionStorage.getItem('machiAdminToken')).toBe('tok')

    const pending = document.getElementById('pending-posts')!
    expect(pending.textContent).toContain('Biete: Gassi gehen')
    expect(pending.textContent).toContain('Freigeben')
    expect(pending.textContent).toContain('Ablehnen')

    const comments = document.getElementById('pending-comments')!
    expect(comments.textContent).toContain('Toller Post!')
    expect(comments.textContent).toContain('Biete: Gassi gehen')

    const live = document.getElementById('live-posts')!
    expect(live.textContent).toContain('Suche: Katze')
    expect(live.textContent).toContain('Löschen')
    const liveImg = live.querySelector('img')!
    expect(liveImg.getAttribute('data-photo')).toBe('/api/photos/k2')
    expect(liveImg.getAttribute('src')).toContain('blob:fake-')
  })

  it('loads photo previews with the admin session and shows them as blob URLs', async () => {
    const pendingWithPhoto = {
      ...pendingBody,
      posts: [{ ...pendingBody.posts[0], photoKey: 'k1' }],
    }
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit = {}) => {
        calls.push({ url, init })
        if (url.endsWith('/login')) return json(200, { token: 'tok', expiresAt: new Date(Date.now() + 864e5).toISOString() })
        if (url.endsWith('/pending')) return json(200, pendingWithPhoto)
        if (url.endsWith('/live')) return json(200, liveBody)
        if (url.includes('/api/photos/k1')) {
          return new Response('foto-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } })
        }
        return json(404, { error: 'unbekannt' })
      }),
    )
    initAdminPage()
    fillAndSubmitLogin('geheim')
    await waitVisible('queue-section')

    const photoCall = calls.find((c) => c.url.includes('/api/photos/k1'))!
    expect(photoCall).toBeTruthy()
    expect(String(photoCall.init.headers?.authorization)).toBe('Bearer tok')
    const img = document.querySelector('#pending-posts img') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('blob:fake-')
  })

  it('shows the generic German error on a wrong password', async () => {
    stubApi()
    initAdminPage()
    fillAndSubmitLogin('falsch')

    await waitVisible('login-error')
    expect(document.getElementById('login-error')!.textContent).toContain('Anmeldung fehlgeschlagen.')
    expect(document.getElementById('queue-section')!.hidden).toBe(true)
    expect(sessionStorage.getItem('machiAdminToken')).toBeNull()
  })

  it('approves a pending post and removes it from the queue', async () => {
    const actions: string[] = []
    stubApi({ onAction: (url) => actions.push(url) })
    initAdminPage()
    fillAndSubmitLogin()
    await waitVisible('queue-section')

    pendingBody.posts.length = 0
    const approveBtn = Array.from(document.querySelectorAll('#pending-posts button')).find((b) =>
      b.textContent!.includes('Freigeben'),
    ) as HTMLButtonElement
    approveBtn.click()

    await vi.waitFor(() => {
      expect(actions).toHaveLength(1)
    })
    expect(actions[0]).toContain('/posts/post-1/approve')
    await vi.waitFor(() => {
      expect(document.getElementById('pending-posts')!.textContent).toContain('Nichts ausstehend')
    })
  })

  it('rejects a pending comment and removes it from the queue', async () => {
    const actions: string[] = []
    stubApi({ onAction: (url) => actions.push(url) })
    initAdminPage()
    fillAndSubmitLogin()
    await waitVisible('queue-section')

    pendingBody.comments.length = 0
    const rejectBtn = Array.from(document.querySelectorAll('#pending-comments button')).find((b) =>
      b.textContent!.includes('Ablehnen'),
    ) as HTMLButtonElement
    rejectBtn.click()

    await vi.waitFor(() => {
      expect(actions).toHaveLength(1)
    })
    expect(actions[0]).toContain('/comments/comment-1/reject')
    await vi.waitFor(() => {
      expect(document.getElementById('pending-comments')!.textContent).toContain('Nichts ausstehend')
    })
  })

  it('deletes a live post from the live list', async () => {
    const actions: string[] = []
    stubApi({ onAction: (url, init) => actions.push(`${init.method} ${url}`) })
    initAdminPage()
    fillAndSubmitLogin()
    await waitVisible('queue-section')

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    liveBody.posts.length = 0
    const deleteBtn = Array.from(document.querySelectorAll('#live-posts button')).find((b) =>
      b.textContent!.includes('Löschen'),
    ) as HTMLButtonElement
    deleteBtn.click()

    await vi.waitFor(() => {
      expect(actions).toHaveLength(1)
    })
    expect(actions[0]).toBe('DELETE /api/admin/b1/posts/post-2')
    await vi.waitFor(() => {
      expect(document.getElementById('live-posts')!.textContent).toContain('Noch nichts live')
    })
  })

  it('returns to the login form when the session is rejected with 401', async () => {
    sessionStorage.setItem('machiAdminToken', 'stale')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { error: 'Sitzung abgelaufen. Bitte erneut anmelden.' })),
    )
    initAdminPage()

    await waitVisible('login-section')
    expect(document.getElementById('queue-section')!.hidden).toBe(true)
    expect(sessionStorage.getItem('machiAdminToken')).toBeNull()
  })

  it('logs out via the logout button', async () => {
    stubApi()
    initAdminPage()
    fillAndSubmitLogin()
    await waitVisible('queue-section')

    document.getElementById('logout-btn')!.click()
    expect(document.getElementById('login-section')!.hidden).toBe(false)
    expect(document.getElementById('queue-section')!.hidden).toBe(true)
    expect(sessionStorage.getItem('machiAdminToken')).toBeNull()
  })
})
