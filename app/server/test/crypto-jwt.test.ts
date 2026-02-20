import { createPrivateKey, createPublicKey } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  generateRSAKeyPair,
  signAccessToken,
  verifyAccessToken,
} from '../src/utils/crypto'

describe('crypto jwt utilities', () => {
  it('generates rsa key pair in pem format', async () => {
    const keys = await generateRSAKeyPair()

    expect(keys.privateKey).toContain('BEGIN PRIVATE KEY')
    expect(keys.publicKey).toContain('BEGIN PUBLIC KEY')
  })

  it('signs and verifies RS256 access tokens', async () => {
    const keys = await generateRSAKeyPair()

    const privateKey = createPrivateKey(keys.privateKey)
    const publicKey = createPublicKey(keys.publicKey)

    const payload = {
      sub: 'user-1',
      sid: 'session-1',
      pid: 'project-1',
      email: 'user@example.com',
      emailVerified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      iss: 'https://api.authkit.dev',
    }

    const token = await signAccessToken(payload, privateKey)
    const verified = await verifyAccessToken(token, publicKey)

    expect(verified.sub).toBe(payload.sub)
    expect(verified.sid).toBe(payload.sid)
    expect(verified.pid).toBe(payload.pid)
    expect(verified.email).toBe(payload.email)
  })
})
