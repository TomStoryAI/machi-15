// TV display page logic — vanilla ES module, no build step.
// Board layout per Tom's sample board (spec 013): 3 rows x 9 columns of tiles.
// Empty tiles are QR codes (scan -> post there); taken tiles show the post;
// the sponsor banner sits in the middle of the middle row.
// Polls the feed every POLL_MS, caches the last good feed in localStorage,
// and shows a subtle offline hint instead of a blank screen.
import { qrSvg } from './qr.js'
import { contactsLine, esc } from './ui.js'

export const POLL_MS = 25_000
export const GRID_COLS = 9
export const GRID_ROWS = 3
export const SPONSOR_POSITION = 12 // 0-based cell in the 9-col grid = start of the middle 3 columns of row 2

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

export function commentUrl(origin, boardId, postId) {
  return `${origin}/b/${boardId}/p/${postId}`
}

export function frameHtml(post, boardId, origin) {
  const count = post.comments.length
  const commentsBadge = count === 0 ? '' : `<span class="frame-comments">${count === 1 ? '1 Kommentar' : `${count} Kommentare`}</span>`
  // Feed comments arrive oldest-first; show the newest three in chronological order.
  const visibleComments = post.comments.slice(-3)
  const commentList = visibleComments.length
    ? `<ul class="frame-comment-list">${visibleComments.map((c) => `<li>${esc(c.body)}</li>`).join('')}</ul>`
    : ''
  return `
    <article class="frame">
      <h2 class="frame-title">${esc(post.title)}</h2>
      ${post.photoKey ? `<img class="frame-photo" src="/api/photos/${esc(post.photoKey)}" alt="${esc(post.title)}" />` : ''}
      <p class="frame-body">${esc(post.body)}</p>
      ${contactsLine(post)}
      ${commentsBadge}
      ${commentList}
      <div class="frame-qr">${qrSvg(commentUrl(origin, boardId, post.id), 3, 1)}</div>
    </article>`
}

export function qrTileHtml(submitUrl) {
  return `<div class="tile"><div class="tile-qr">${qrSvg(submitUrl, 4, 2)}</div></div>`
}

// 1-based tile number -> index in the rendered cell array (sponsor spans 3 cells, so
// tiles after it shift by 2). Sponsor cells return -1.
export function cellIndexForSlot(slot) {
  if (slot < 13) return slot - 1
  if (slot > 15) return slot - 3
  return -1
}

export function sponsorHtml(board) {
  const logo = board.promoterLogoKey
    ? `<img class="promoter-logo" src="/promoter/${esc(board.promoterLogoKey)}" alt="${esc(board.promoterName ?? '')}" />`
    : ''
  return `
    <div class="sponsor" style="grid-column: span 3">
      ${logo}
      ${board.promoterName ? `<span class="promoter-name">${esc(board.promoterName)}</span>` : ''}
      ${board.promoterSlogan ? `<span class="promoter-slogan">${esc(board.promoterSlogan)}</span>` : ''}
    </div>`
}

// One cell per DOM element: 24 tiles + 1 sponsor (spanning 3 grid cells) = 25 elements.
// Posts with a slot render in exactly that tile; unslotted posts fill free tiles in
// feed order (spec 014). Every QR tile encodes its own slot so a scan posts into that tile.
export function buildBoardHtml(posts, boardId, origin, board) {
  const submitUrl = submitQrUrl(origin, boardId)
  const bySlot = new Map()
  const unslotted = []
  for (const p of posts) {
    if (Number.isInteger(p.slot) && p.slot >= 1 && p.slot <= 27 && !bySlot.has(p.slot)) {
      bySlot.set(p.slot, p)
    } else {
      unslotted.push(p)
    }
  }
  const cells = []
  let u = 0
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    if (i === SPONSOR_POSITION) {
      cells.push(sponsorHtml(board))
      i += 2 // the banner covers three columns
      continue
    }
    const slot = i + 1 // 1-based tile number
    const post = bySlot.get(slot) ?? unslotted[u++]
    cells.push(post ? frameHtml(post, boardId, origin) : qrTileHtml(`${submitUrl}?slot=${slot}`))
  }
  return cells
}

export function initDisplayPage() {
  const boardId = boardIdFromPath(location.pathname)
  const grid = document.getElementById('grid')
  const offlineHint = document.getElementById('offline-hint')
  if (!boardId || !grid || !offlineHint) return

  const feedUrl = `/api/boards/${boardId}/feed`
  const key = cacheKey(boardId)

  function render(data) {
    grid.innerHTML = buildBoardHtml(data.posts, boardId, location.origin, data.board).join('')
  }

  function setOffline(visible) {
    offlineHint.hidden = !visible
  }

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
