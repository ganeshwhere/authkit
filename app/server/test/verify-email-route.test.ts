import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { generateTokenHash } from '../src/utils/crypto'
import { globalErrorHandler } from '../src/utils/error-handler'

let authRoutes: (typeof import('../src/routes/auth'))['default']

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = 'key'
  process.env.JWT_PUBLIC_KEY = 'key'
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  authRoutes = (await import('../src/routes/auth')).default
})

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getVerificationToken: vi.fn(async () => null),
    getUserById: vi.fn(async () => null),
    getUserByEmail: vi.fn(async () => null),
    updateUser: vi.fn(async () => ({
      id: 'user_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'User',
      avatarUrl: null,
      metadata: {},
      bannedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    markTokenUsed: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('POST /v1/auth/verify-email', () => {
  it('rejects invalid token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: 'missing' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_TOKEN')

    await server.close()
  })

  it('marks email as verified for valid token', async () => {
    const rawToken = 'verify-token'
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
          type: 'email_verify',
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date(),
        }
      }),
      getUserByEmail: vi.fn(async () => ({
        id: 'user_1',
        projectId: 'project_1',
        email: 'user@example.com',
        emailVerified: false,
        displayName: 'User',
        avatarUrl: null,
        metadata: {},
        bannedAt: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: rawToken },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.emailVerified).toBe(true)
    expect(adapter.markTokenUsed).toHaveBeenCalledWith(tokenHash)

    await server.close()
  })
})
