// Poster management page — vanilla ES module, no build step.
// The management token travels in the URL query (?t=...), never stored anywhere.
import { contactsLine, esc } from './ui.js'

export function postIdAndTokenFromLocation(pathname, search) {
  const m = pathname.match(/^\/p\/([^/]+)\/?$/)
  if (!m) return null
  return { postId: decodeURIComponent(m[1]), token: new URLSearchParams(search).get('t') ?? '' }
}

export function statusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Dein Inserat wird geprüft.'
    case 'live':
      return 'Dein Inserat ist live.'
    case 'rejected':
      return 'Dein Inserat wurde abgelehnt.'
    case 'deleted':
      return 'Dein Inserat wurde gelöscht.'
    default:
      return ''
  }
}

export function initPosterPage() {
  const ids = postIdAndTokenFromLocation(location.pathname, location.search)
  const errorBox = document.getElementById('error')
  const statusBox = document.getElementById('status-box')
  const adBox = document.getElementById('ad-box')
  const commentsBox = document.getElementById('comments-box')
  const commentsList = document.getElementById('comments-list')
  const deleteBtn = document.getElementById('delete-btn')

  if (!ids || !errorBox || !statusBox || !adBox || !deleteBtn) return
  const { postId, token } = ids
  const apiUrl = `/api/posts/${postId}?t=${encodeURIComponent(token)}`

  function showError(message) {
    errorBox.textContent = message
    errorBox.hidden = false
    statusBox.hidden = true
    adBox.hidden = true
    commentsBox.hidden = true
    deleteBtn.hidden = true
  }

  async function load() {
    let res
    try {
      res = await fetch(apiUrl)
    } catch {
      showError('Netzwerkfehler. Bitte prüfe Deine Verbindung und versuche es erneut.')
      return
    }
    if (res.status === 404) {
      showError('Inserat nicht gefunden oder Link ist ungültig.')
      return
    }
    if (!res.ok) {
      showError('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
      return
    }
    const post = await res.json()

    errorBox.hidden = true
    statusBox.textContent = statusLabel(post.status)
    statusBox.hidden = false

    adBox.innerHTML = `
      <span class="meta">${esc(post.category)} · ${esc(post.createdAt)}</span>
      <h2>${esc(post.title)}</h2>
      <p>${esc(post.body)}</p>
      ${contactsLine(post)}`
    adBox.hidden = false

    commentsBox.hidden = false
    commentsList.innerHTML = post.comments.length
      ? post.comments.map((c) => `<li>${esc(c.body)}</li>`).join('')
      : '<li class="empty">Noch keine Kommentare.</li>'

    deleteBtn.hidden = post.status === 'rejected' || post.status === 'deleted'
  }

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Inserat wirklich löschen?')) return
    let res
    try {
      res = await fetch(apiUrl, { method: 'DELETE' })
    } catch {
      showError('Netzwerkfehler. Bitte prüfe Deine Verbindung und versuche es erneut.')
      return
    }
    if (!res.ok) {
      showError('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
      return
    }
    await load()
  })

  load()
}
