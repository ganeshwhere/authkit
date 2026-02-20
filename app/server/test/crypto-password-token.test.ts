import { describe, expect, it } from 'vitest'

import {
  decrypt,
  encrypt,
  generateSecureToken,
  generateTokenHash,
  hashPassword,
  signHMAC,
  verifyHMAC,
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

  it('signs and verifies hmac signatures', () => {
    const payload = 'timestamp.payload'
    const secret = 'super-secret-hmac-key-1234567890'

    const signature = signHMAC(payload, secret)

    expect(verifyHMAC(payload, signature, secret)).toBe(true)
    expect(verifyHMAC(`${payload}.tampered`, signature, secret)).toBe(false)
    expect(verifyHMAC(payload, `${signature}0`, secret)).toBe(false)
  })

  it('encrypts and decrypts using aes-256-gcm', () => {
    const key = Buffer.from('a'.repeat(64), 'hex')

    const ciphertext = encrypt('sensitive-value', key)
    const plaintext = decrypt(ciphertext, key)

    expect(plaintext).toBe('sensitive-value')
  })

  it('rejects tampered ciphertext', () => {
    const key = Buffer.from('a'.repeat(64), 'hex')
    const ciphertext = encrypt('secret', key)
    const [iv, payload, tag] = ciphertext.split('.')

    expect(() => decrypt(`${iv}.${payload}x.${tag}`, key)).toThrowError()
  })
})
