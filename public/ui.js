// Shared tiny UI helpers for the vanilla pages (no framework, no build step).
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
}

const CONTACT_LABELS = [
  ['contactPhone', 'Tel.'],
  ['contactWhatsapp', 'WhatsApp'],
  ['contactEmail', 'E-Mail'],
  ['contactInstagram', 'Instagram'],
  ['contactAddress', 'Adresse'],
]

export function contactsLine(post) {
  const parts = CONTACT_LABELS.filter(([key]) => post[key]).map(([key, label]) => `${label}: ${esc(post[key])}`)
  return parts.length ? `<p class="contacts">${parts.join(' · ')}</p>` : ''
}
