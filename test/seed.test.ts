import { describe, expect, it } from 'vitest'
import { hashPassword, seedSql } from '../scripts/seed-board.mjs'
import { verifyAdminPassword } from '../src/admin'

describe('seed script password hashing', () => {
  it('produces hashes the worker verifies (cross-implementation check)', async () => {
    const stored = hashPassword('geheim')
    expect(stored).toMatch(/^pbkdf2-sha256\$100000\$[A-Za-z0-9+/=]+\$[0-9a-f]{64}$/)
    expect(await verifyAdminPassword('geheim', stored)).toBe(true)
    expect(await verifyAdminPassword('falsch', stored)).toBe(false)
  })

  it('uses a unique salt per run', () => {
    expect(hashPassword('geheim')).not.toBe(hashPassword('geheim'))
  })
})

describe('seedSql', () => {
  it('builds an idempotent upsert for exactly one board', () => {
    const sql = seedSql({
      id: 'b1',
      name: "Tom's Board",
      location: 'Mainstrasse 1',
      adminPasswordHash: 'pbkdf2-sha256$1000$c2FsdA$aabb',
      promoterName: 'REWE FAMILIE SCHULZE',
      promoterLogoKey: null,
      promoterSlogan: 'Mehr Naehe geht nicht.',
    })
    expect(sql).toContain('INSERT INTO boards')
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE")
    expect(sql).toContain("'Tom''s Board'")
    expect(sql).toContain('excluded.admin_password_hash')
  })
})
