// Admin page logic — vanilla ES module, no build step.
import { contactsLine, esc } from './ui.js'

export function boardIdFromAdminPath(pathname) {
  const m = pathname.match(/^\/admin\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

function postCard(post) {
  return `
    <article class="card">
      <span class="badge">${esc(post.category)}</span>
      <h4>${esc(post.title)}</h4>
      <p>${esc(post.body)}</p>
      ${post.photoKey ? `<img src="/api/photos/${esc(post.photoKey)}" alt="Foto" loading="lazy" />` : ''}
      ${contactsLine(post)}
      <p class="meta">${esc(post.createdAt)} · ${esc(post.durationWeeks)} W.</p>
      <div class="actions">
        <button type="button" class="primary" data-action="approve-post" data-id="${esc(post.id)}">Freigeben</button>
        <button type="button" class="danger" data-action="reject-post" data-id="${esc(post.id)}">Ablehnen</button>
      </div>
    </article>`
}

function commentCard(comment) {
  return `
    <article class="card">
      <p class="meta">zu: ${esc(comment.postTitle)}</p>
      <p>${esc(comment.body)}</p>
      <div class="actions">
        <button type="button" class="primary" data-action="approve-comment" data-id="${esc(comment.id)}">Freigeben</button>
        <button type="button" class="danger" data-action="reject-comment" data-id="${esc(comment.id)}">Ablehnen</button>
      </div>
    </article>`
}

function liveCard(post) {
  return `
    <article class="card">
      <span class="badge">${esc(post.category)}</span>
      <h4>${esc(post.title)}</h4>
      <p>${esc(post.body)}</p>
      ${post.photoKey ? `<img src="/api/photos/${esc(post.photoKey)}" alt="Foto" loading="lazy" />` : ''}
      ${contactsLine(post)}
      <p class="meta">${esc(post.createdAt)}</p>
      <div class="actions">
        <button type="button" class="danger" data-action="delete-post" data-id="${esc(post.id)}">Löschen</button>
      </div>
    </article>`
}

export function initAdminPage() {
  const boardId = boardIdFromAdminPath(location.pathname)
  const loginSection = document.getElementById('login-section')
  const loginForm = document.getElementById('login-form')
  const loginError = document.getElementById('login-error')
  const passwordInput = document.getElementById('password')
  const queueSection = document.getElementById('queue-section')
  const pendingPosts = document.getElementById('pending-posts')
  const pendingComments = document.getElementById('pending-comments')
  const livePosts = document.getElementById('live-posts')
  const logoutBtn = document.getElementById('logout-btn')

  if (!boardId || !loginForm || !queueSection) return

  const TOKEN_KEY = 'machiAdminToken'
  let token = sessionStorage.getItem(TOKEN_KEY)

  function showLogin() {
    loginSection.hidden = false
    queueSection.hidden = true
  }

  function clearSession() {
    token = null
    sessionStorage.removeItem(TOKEN_KEY)
    showLogin()
  }

  async function api(path, init = {}) {
    const headers = { authorization: `Bearer ${token}` }
    if (init.body) headers['content-type'] = 'application/json'
    const res = await fetch(path, { ...init, headers })
    if (res.status === 401) {
      clearSession()
      return null
    }
    return res
  }

  function renderList(el, html, emptyText) {
    el.innerHTML = html.length ? html : `<p class="empty">${emptyText}</p>`
  }

  async function load() {
    const [pendingRes, liveRes] = await Promise.all([api(`/api/admin/${boardId}/pending`), api(`/api/admin/${boardId}/live`)])
    if (!pendingRes || !liveRes) return
    const pending = await pendingRes.json()
    const live = await liveRes.json()
    renderList(pendingPosts, pending.posts.map(postCard).join(''), 'Nichts ausstehend.')
    renderList(pendingComments, pending.comments.map(commentCard).join(''), 'Nichts ausstehend.')
    renderList(livePosts, live.posts.map(liveCard).join(''), 'Noch nichts live.')
    queueSection.hidden = false
    loginSection.hidden = true
  }

  async function handleAction(action, id) {
    const board = `/api/admin/${boardId}`
    let method = 'POST'
    let path = ''
    switch (action) {
      case 'approve-post':
        path = `${board}/posts/${id}/approve`
        break
      case 'reject-post':
        path = `${board}/posts/${id}/reject`
        break
      case 'approve-comment':
        path = `${board}/comments/${id}/approve`
        break
      case 'reject-comment':
        path = `${board}/comments/${id}/reject`
        break
      case 'delete-post':
        if (!confirm('Inserat wirklich löschen?')) return
        path = `${board}/posts/${id}`
        method = 'DELETE'
        break
      default:
        return
    }
    await api(path, { method })
    await load()
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const res = await fetch(`/api/admin/${boardId}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value }),
    })
    if (res.ok) {
      const data = await res.json()
      token = data.token
      sessionStorage.setItem(TOKEN_KEY, data.token)
      loginError.hidden = true
      await load()
    } else {
      const data = await res.json().catch(() => ({}))
      loginError.textContent = data.error || 'Anmeldung fehlgeschlagen.'
      loginError.hidden = false
    }
  })

  logoutBtn.addEventListener('click', clearSession)

  queueSection.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]')
    if (btn) handleAction(btn.dataset.action, btn.dataset.id)
  })

  if (token) {
    load()
  } else {
    showLogin()
  }
}
