import { describe, expect, it } from 'vitest'
import { hashAdminPassword, verifyAdminPassword } from '../src/admin'

describe('admin password hashing', () => {
  it('hashes with PBKDF2 in a self-describing format', async () => {
    const stored = await hashAdminPassword('geheim', { iterations: 1000 })
    expect(stored).toMatch(/^pbkdf2-sha256\$1000\$[A-Za-z0-9+/=]+\$[0-9a-f]{64}$/)
  })

  it('verifies the correct password', async () => {
    const stored = await hashAdminPassword('geheim', { iterations: 1000 })
    expect(await verifyAdminPassword('geheim', stored)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const stored = await hashAdminPassword('geheim', { iterations: 1000 })
    expect(await verifyAdminPassword('falsch', stored)).toBe(false)
  })

  it('rejects a malformed stored hash', async () => {
    expect(await verifyAdminPassword('geheim', 'plain-seed')).toBe(false)
    expect(await verifyAdminPassword('geheim', 'pbkdf2-sha256$abc$salt$hash')).toBe(false)
    expect(await verifyAdminPassword('geheim', '')).toBe(false)
  })

  it('uses a unique salt per hash', async () => {
    const a = await hashAdminPassword('geheim', { iterations: 1000 })
    const b = await hashAdminPassword('geheim', { iterations: 1000 })
    expect(a).not.toBe(b)
    expect(await verifyAdminPassword('geheim', a)).toBe(true)
    expect(await verifyAdminPassword('geheim', b)).toBe(true)
  })
})
