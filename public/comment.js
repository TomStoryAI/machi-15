// Comment form page logic — vanilla ES module, no build step.
// The post is looked up in the public feed (comments are only possible on live posts).
import { esc, postWithRetry } from './ui.js'

export function boardIdAndPostIdFromPath(pathname) {
  const m = pathname.match(/^\/b\/([^/]+)\/p\/([^/]+)\/?$/)
  return m ? { boardId: decodeURIComponent(m[1]), postId: decodeURIComponent(m[2]) } : null
}

export function initCommentPage() {
  const ids = boardIdAndPostIdFromPath(location.pathname)
  const errorBox = document.getElementById('error')
  const postBox = document.getElementById('post-box')
  const formSection = document.getElementById('form-section')
  const form = document.getElementById('comment-form')
  const bodyInput = document.getElementById('comment-body')
  const confirmation = document.getElementById('confirmation')

  if (!ids || !form || !errorBox || !postBox) return
  const { boardId, postId } = ids

  function showError(message) {
    errorBox.textContent = message
    errorBox.hidden = false
  }

  async function loadPost() {
    let data
    try {
      const res = await fetch(`/api/boards/${boardId}/feed`)
      if (!res.ok) throw new Error(`feed ${res.status}`)
      data = await res.json()
    } catch {
      showError('Netzwerkfehler. Bitte prüfe Deine Verbindung und versuche es erneut.')
      return
    }
    const post = data.posts.find((p) => p.id === postId)
    if (!post) {
      showError('Inserat nicht gefunden.')
      formSection.hidden = true
      return
    }
    postBox.innerHTML = `<h2>${esc(post.title)}</h2><p>${esc(post.body)}</p>`
    postBox.hidden = false
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorBox.hidden = true
    const res = await postWithRetry(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: bodyInput.value }),
    })
    if (!res) {
      showError('Netzwerkfehler. Bitte prüfe Deine Verbindung und versuche es erneut.')
      return
    }
    if (res.status === 201) {
      formSection.hidden = true
      confirmation.hidden = false
    } else {
      const data = await res.json().catch(() => ({}))
      showError(data.error || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.')
    }
  })

  loadPost()
}
