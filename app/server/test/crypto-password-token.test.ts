import { describe, expect, it } from 'vitest'

import {
  generateSecureToken,
  generateTokenHash,
  hashPassword,
  verifyPassword,
} from '../src/utils/crypto'

describe('crypto password + token utilities', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('StrongPassword#123')

    await expect(verifyPassword('StrongPassword#123', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('generates random base64url tokens', () => {
    const tokenA = generateSecureToken(32)
    const tokenB = generateSecureToken(32)

    expect(tokenA).not.toBe(tokenB)
    expect(tokenA.length).toBeGreaterThan(20)
    expect(tokenA).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('hashes token deterministically with sha256', () => {
    const token = 'token-value'

    const first = generateTokenHash(token)
    const second = generateTokenHash(token)

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })
})
