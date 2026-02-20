import { createPrivateKey, generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { signAccessToken } from '../src/utils/crypto'
import { globalErrorHandler } from '../src/utils/error-handler'

const keyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

let authRoutes: (typeof import('../src/routes/auth'))['default']

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = keyPair.privateKey
  process.env.JWT_PUBLIC_KEY = keyPair.publicKey
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  authRoutes = (await import('../src/routes/auth')).default
})

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getSessionsByUserId: vi.fn(async () => []),
    revokeSession: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('POST /v1/auth/signout', () => {
  it('requires bearer token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({ method: 'POST', url: '/v1/auth/signout' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHORIZED')

    await server.close()
  })

  it('revokes session and clears cookie', async () => {
    const adapter = createAdapter({
      getSessionsByUserId: vi.fn(async () => [
        {
          id: 'session_1',
          userId: 'user_1',
          projectId: 'project_1',
          tokenHash: 'hash_1',
          tokenFamily: 'family_1',
          ipAddress: null,
          userAgent: null,
          lastActiveAt: new Date(),
          expiresAt: new Date(),
          revokedAt: null,
          createdAt: new Date(),
        },
      ]),
    })

    const token = await signAccessToken(
      {
        sub: 'user_1',
        sid: 'session_1',
        pid: 'project_1',
        email: 'user@example.com',
        emailVerified: false,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
        iss: 'https://api.authkit.dev',
      },
      createPrivateKey(keyPair.privateKey),
    )

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signout',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)
    expect(adapter.revokeSession).toHaveBeenCalledWith('hash_1')

    await server.close()
  })
})
