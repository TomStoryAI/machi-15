// Shared mapping of posts rows (snake_case D1) to API shape (camelCase JSON).

export const POST_COLUMNS =
  'id, category, title, body, photo_key, contact_phone, contact_email, contact_whatsapp, contact_instagram, contact_address, duration_weeks, created_at'

export type PostRow = {
  id: string
  category: string
  title: string
  body: string
  photo_key: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  contact_instagram: string | null
  contact_address: string | null
  duration_weeks: number
  created_at: string
}

export function mapPost(row: PostRow) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    photoKey: row.photo_key,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    contactWhatsapp: row.contact_whatsapp,
    contactInstagram: row.contact_instagram,
    contactAddress: row.contact_address,
    durationWeeks: row.duration_weeks,
    createdAt: row.created_at,
  }
}
