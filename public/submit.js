// Submit page logic — vanilla ES module, no build step.
// Pure helpers are exported so Vitest can exercise them directly.
import qrcode from './vendor/qrcode.mjs'

export const PHOTO_MAX_SIDE = 1600
export const PHOTO_JPEG_QUALITY = 0.85

export function boardIdFromPath(pathname) {
  const m = pathname.match(/^\/b\/([^/]+)\/neu\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function fitImage(w, h, maxSide) {
  if (w <= maxSide && h <= maxSide) return { width: w, height: h }
  const scale = maxSide / Math.max(w, h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

export function managementUrl(origin, postId, token) {
  return `${origin}/p/${postId}?t=${encodeURIComponent(token)}`
}

const CONTACT_FIELDS = ['contactPhone', 'contactEmail', 'contactWhatsapp', 'contactInstagram', 'contactAddress']

export function buildPayload(boardId, values) {
  const payload = {
    boardId,
    category: values.category,
    title: String(values.title).trim(),
    body: String(values.body).trim(),
    durationWeeks: Number(values.durationWeeks),
  }
  for (const field of CONTACT_FIELDS) {
    const v = String(values[field] ?? '').trim()
    if (v) payload[field] = v
  }
  return payload
}

export async function resizePhotoFile(file, maxSide = PHOTO_MAX_SIDE, quality = PHOTO_JPEG_QUALITY) {
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width <= maxSide && bitmap.height <= maxSide) {
      return file
    }
    const { width, height } = fitImage(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', quality)
    })
  } finally {
    if (bitmap.close) bitmap.close()
  }
}

export function qrSvg(text, cellSize = 4, margin = 2) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  return qr.createSvgTag(cellSize, margin, text, text)
}

async function postWithRetry(url, payload) {
  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }
  try {
    return await fetch(url, options)
  } catch {
    try {
      return await fetch(url, options)
    } catch {
      return null
    }
  }
}

export function initSubmitPage() {
  const boardId = boardIdFromPath(location.pathname)
  const form = document.getElementById('submit-form')
  const errorBox = document.getElementById('error')
  const formSection = document.getElementById('form-section')
  const confirmation = document.getElementById('confirmation')
  const photoToggle = document.getElementById('photo-toggle')
  const photoFields = document.getElementById('photo-fields')
  const photoFileInput = document.getElementById('photo-file')
  const photoPreview = document.getElementById('photo-preview')
  const photoNote = document.getElementById('photo-note')

  if (!form || !boardId || !errorBox || !formSection || !confirmation) return

  // Kept client-side for now; the photo upload itself lands with spec 004.
  let photoBlob = null

  function showError(message) {
    errorBox.textContent = message
    errorBox.hidden = false
  }

  photoToggle.addEventListener('change', () => {
    photoFields.hidden = !photoToggle.checked
  })

  photoFileInput.addEventListener('change', async () => {
    const file = photoFileInput.files && photoFileInput.files[0]
    if (!file) {
      photoBlob = null
      return
    }
    try {
      photoBlob = await resizePhotoFile(file)
      photoPreview.src = URL.createObjectURL(photoBlob)
      photoPreview.hidden = false
      const kb = Math.round(photoBlob.size / 1024)
      photoNote.textContent =
        photoBlob === file ? `Foto bereit (${kb} KB).` : `Foto automatisch verkleinert (${kb} KB).`
      photoNote.hidden = false
    } catch {
      photoBlob = null
      showError('Das Foto konnte nicht gelesen werden. Bitte versuche ein anderes Bild.')
    }
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorBox.hidden = true
    const fd = new FormData(form)
    const payload = buildPayload(boardId, Object.fromEntries(fd.entries()))
    const res = await postWithRetry('/api/posts', payload)
    if (!res) {
      showError('Netzwerkfehler. Bitte prüfe Deine Verbindung und versuche es erneut.')
      return
    }
    if (res.status === 201) {
      const data = await res.json()
      const url = managementUrl(location.origin, data.postId, data.mgmtToken)
      const link = document.getElementById('mgmt-link')
      link.href = url
      link.textContent = url
      document.getElementById('mgmt-qr').innerHTML = qrSvg(url)
      formSection.hidden = true
      confirmation.hidden = false
    } else {
      const data = await res.json().catch(() => ({}))
      showError(data.error || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.')
    }
  })
}
