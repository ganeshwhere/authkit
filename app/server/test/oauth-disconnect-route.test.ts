import { createPrivateKey, generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { globalErrorHandler } from '../src/utils/error-handler'
import { issueAccessToken } from '../src/utils/tokens'

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

async function createAccessToken(): Promise<string> {
  return issueAccessToken({
    context: {
      userId: 'user_1',
      sessionId: 'session_1',
      projectId: 'project_1',
      email: 'oauth@example.com',
      emailVerified: true,
      issuer: 'https://api.authkit.dev',
    },
    ttlSeconds: 900,
    privateKey: createPrivateKey(keyPair.privateKey),
  })
}

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getOAuthAccountsByUserId: vi.fn(async () => [
      {
        id: 'oauth_1',
        userId: 'user_1',
        projectId: 'project_1',
        provider: 'google',
        providerUserId: 'provider_1',
        rawProfile: {},
        createdAt: new Date(),
      },
    ]),
    getPasswordHash: vi.fn(async () => null),
    getPasskeysByUserId: vi.fn(async () => []),
    deleteOAuthAccount: vi.fn(async () => undefined),
    createAuditLog: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('DELETE /v1/auth/oauth/:provider', () => {
  it('disconnects provider when another auth method exists', async () => {
    const adapter = createAdapter({
      getPasswordHash: vi.fn(async () => 'argon-hash'),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/auth/oauth/google',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)
    expect(adapter.deleteOAuthAccount).toHaveBeenCalledWith('user_1', 'google')

    await server.close()
  })

  it('blocks disconnecting the last auth method', async () => {
    const adapter = createAdapter({
      getPasswordHash: vi.fn(async () => null),
      getPasskeysByUserId: vi.fn(async () => []),
      getOAuthAccountsByUserId: vi.fn(async () => [
        {
          id: 'oauth_1',
          userId: 'user_1',
          projectId: 'project_1',
          provider: 'google',
          providerUserId: 'provider_1',
          rawProfile: {},
          createdAt: new Date(),
        },
      ]),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/auth/oauth/google',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('CANNOT_REMOVE_LAST_AUTH_METHOD')
    expect(adapter.deleteOAuthAccount).not.toHaveBeenCalled()

    await server.close()
  })

  it('is idempotent when provider is not linked', async () => {
    const adapter = createAdapter({
      getOAuthAccountsByUserId: vi.fn(async () => [
        {
          id: 'oauth_2',
          userId: 'user_1',
          projectId: 'project_1',
          provider: 'github',
          providerUserId: 'provider_2',
          rawProfile: {},
          createdAt: new Date(),
        },
      ]),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/auth/oauth/google',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)
    expect(adapter.deleteOAuthAccount).not.toHaveBeenCalled()

    await server.close()
  })
})
