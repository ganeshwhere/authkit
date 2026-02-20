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

let userRoutes: (typeof import('../src/routes/user'))['default']

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = keyPair.privateKey
  process.env.JWT_PUBLIC_KEY = keyPair.publicKey
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  userRoutes = (await import('../src/routes/user')).default
})

async function createToken(sessionId: string): Promise<string> {
  return signAccessToken(
    {
      sub: 'user_1',
      sid: sessionId,
      pid: 'project_1',
      email: 'user@example.com',
      emailVerified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      iss: 'https://api.authkit.dev',
    },
    createPrivateKey(keyPair.privateKey),
  )
}

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getSessionsByUserId: vi.fn(async () => [
      {
        id: 'session_current',
        userId: 'user_1',
        projectId: 'project_1',
        tokenHash: 'hash_current',
        tokenFamily: 'family_1',
        ipAddress: null,
        userAgent: null,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: new Date(),
      },
      {
        id: 'session_other',
        userId: 'user_1',
        projectId: 'project_1',
        tokenHash: 'hash_other',
        tokenFamily: 'family_1',
        ipAddress: null,
        userAgent: null,
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: new Date(),
      },
    ]),
    revokeSession: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('/v1/user/sessions routes', () => {
  it('lists active sessions', async () => {
    const token = await createToken('session_current')
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/user/sessions',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.sessions).toHaveLength(2)

    await server.close()
  })

  it('revokes selected session by id', async () => {
    const token = await createToken('session_current')
    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/user/sessions/session_other',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.revokeSession).toHaveBeenCalledWith('hash_other')

    await server.close()
  })

  it('revoke all keeps current session', async () => {
    const token = await createToken('session_current')
    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/user/sessions',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.revokeSession).toHaveBeenCalledTimes(1)
    expect(adapter.revokeSession).toHaveBeenCalledWith('hash_other')

    await server.close()
  })
})
