// TV display page logic — vanilla ES module, no build step.
// Polls the feed every POLL_MS, caches the last good feed in localStorage,
// and shows a subtle offline hint instead of a blank screen.
import { qrSvg } from './qr.js'
import { contactsLine, esc } from './ui.js'

export const POLL_MS = 25_000

export function cacheKey(boardId) {
  return `machiFeed:${boardId}`
}

export function boardIdFromPath(pathname) {
  const m = pathname.match(/^\/b\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function submitQrUrl(origin, boardId) {
  return `${origin}/b/${boardId}/neu`
}

export function frameHtml(post) {
  const count = post.comments.length
  const commentsBadge = count === 0 ? '' : `<span class="frame-comments">${count === 1 ? '1 Kommentar' : `${count} Kommentare`}</span>`
  return `
    <article class="frame">
      <h2 class="frame-title">${esc(post.title)}</h2>
      ${post.photoKey ? `<img class="frame-photo" src="/api/photos/${esc(post.photoKey)}" alt="${esc(post.title)}" />` : ''}
      <p class="frame-body">${esc(post.body)}</p>
      ${contactsLine(post)}
      ${commentsBadge}
    </article>`
}

function renderPromoter(el, board) {
  if (!board.promoterName) {
    el.hidden = true
    return
  }
  el.hidden = false
  el.innerHTML = `
    ${board.promoterLogoKey ? `<img class="promoter-logo" src="/api/photos/${esc(board.promoterLogoKey)}" alt="${esc(board.promoterName)}" />` : ''}
    <span class="promoter-name">${esc(board.promoterName)}</span>
    ${board.promoterSlogan ? `<span class="promoter-slogan">${esc(board.promoterSlogan)}</span>` : ''}`
}

export function initDisplayPage() {
  const boardId = boardIdFromPath(location.pathname)
  const frames = document.getElementById('frames')
  const qrBox = document.getElementById('qr-box')
  const promoterTile = document.getElementById('promoter-tile')
  const offlineHint = document.getElementById('offline-hint')
  if (!boardId || !frames || !qrBox) return

  const feedUrl = `/api/boards/${boardId}/feed`
  const key = cacheKey(boardId)

  function render(data) {
    frames.innerHTML = data.posts.length
      ? data.posts.map(frameHtml).join('')
      : '<p class="empty">Noch keine Inserate.</p>'
    renderPromoter(promoterTile, data.board)
  }

  function setOffline(visible) {
    offlineHint.hidden = !visible
  }

  // QR tile never changes: plain URL of this board's submit page.
  qrBox.innerHTML = qrSvg(submitQrUrl(location.origin, boardId))

  // Last good feed from localStorage keeps the screen useful while offline.
  const cached = localStorage.getItem(key)
  if (cached) {
    try {
      render(JSON.parse(cached))
    } catch {
      localStorage.removeItem(key)
    }
  }

  async function poll() {
    try {
      const res = await fetch(feedUrl)
      if (!res.ok) throw new Error(`feed ${res.status}`)
      const data = await res.json()
      localStorage.setItem(key, JSON.stringify(data))
      render(data)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }

  poll()
  setInterval(poll, POLL_MS)
}
