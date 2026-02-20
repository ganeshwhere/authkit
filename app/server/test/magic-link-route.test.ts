import { generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { generateTokenHash } from '../src/utils/crypto'
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
    getUserByEmail: vi.fn(async () => null),
    createVerificationToken: vi.fn(async () => ({
      id: 'token_1',
      projectId: 'project_1',
      userId: null,
      email: 'user@example.com',
      tokenHash: 'hash',
      type: 'magic_link',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    })),
    getVerificationToken: vi.fn(async () => null),
    getUserById: vi.fn(async () => null),
    createUser: vi.fn(async () => ({
      id: 'user_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: null,
      avatarUrl: null,
      metadata: {},
      bannedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    markTokenUsed: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({
      id: 'session_1',
      userId: 'user_1',
      projectId: 'project_1',
      tokenHash: 'hash_session',
      tokenFamily: 'family_1',
      ipAddress: null,
      userAgent: null,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    })),
    ...overrides,
  }
}

describe('magic link routes', () => {
  it('magic-link send always succeeds', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/magic-link/send',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'user@example.com',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)

    await server.close()
  })

  it('magic-link verify rejects invalid token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/auth/magic-link/verify?token=invalid-token',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_TOKEN')

    await server.close()
  })

  it('magic-link verify signs in user for valid token', async () => {
    const rawToken = 'valid-token'
    const tokenHash = generateTokenHash(rawToken)

    const adapter = createAdapter({
      getVerificationToken: vi.fn(async (hash: string) => {
        if (hash !== tokenHash) {
          return null
        }

        return {
          id: 'token_1',
          projectId: 'project_1',
          userId: null,
          email: 'user@example.com',
          tokenHash,
          type: 'magic_link',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date(),
        }
      }),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'GET',
      url: `/v1/auth/magic-link/verify?token=${rawToken}`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.email).toBe('user@example.com')
    expect(typeof response.json().data.accessToken).toBe('string')

    await server.close()
  })
})
