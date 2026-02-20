import { createHash, generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

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

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function createCache() {
  const store = new Map<string, string>()

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },
    async set(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
    async increment(key: string): Promise<number> {
      const next = Number(store.get(key) ?? '0') + 1
      store.set(key, String(next))
      return next
    },
    async expire(_key: string, _ttlSeconds: number): Promise<void> {
      // no-op
    },
    async exists(key: string): Promise<boolean> {
      return store.has(key)
    },
  }
}

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getSessionByTokenHash: vi.fn(async () => null),
    getUserById: vi.fn(async () => null),
    revokeSession: vi.fn(async () => undefined),
    revokeSessionFamily: vi.fn(async () => undefined),
    createAuditLog: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({
      id: 'session_new',
      userId: 'user_1',
      projectId: 'project_1',
      tokenHash: 'hash_new',
      tokenFamily: 'family_1',
      ipAddress: null,
      userAgent: null,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      createdAt: new Date(),
    })),
    ...overrides,
  }
}

describe('POST /v1/auth/refresh', () => {
  it('rejects invalid refresh token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        cookie: 'refresh_token=unknown-token',
      },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_REFRESH_TOKEN')

    await server.close()
  })

  it('rotates refresh token and issues access token', async () => {
    const oldRefreshToken = 'old-refresh-token'

    const adapter = createAdapter({
      getSessionByTokenHash: vi.fn(async (hash: string) => {
        if (hash !== hashToken(oldRefreshToken)) {
          return null
        }

        return {
          id: 'session_old',
          userId: 'user_1',
          projectId: 'project_1',
          tokenHash: hash,
          tokenFamily: 'family_1',
          ipAddress: null,
          userAgent: null,
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
          revokedAt: null,
          createdAt: new Date(),
        }
      }),
      getUserById: vi.fn(async () => ({
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
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        cookie: `refresh_token=${oldRefreshToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().data.accessToken).toBe('string')
    expect(adapter.revokeSession).toHaveBeenCalled()

    await server.close()
  })

  it('detects refresh token reuse and revokes session family', async () => {
    const reusedToken = 'reused-token'
    const reusedHash = hashToken(reusedToken)
    const cache = createCache()

    await cache.set(
      `session:used_refresh:${reusedHash}`,
      JSON.stringify({
        tokenFamily: 'family_1',
        userId: 'user_1',
        projectId: 'project_1',
      }),
    )

    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        cookie: `refresh_token=${reusedToken}`,
      },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('TOKEN_REUSE_DETECTED')
    expect(adapter.revokeSessionFamily).toHaveBeenCalledWith('family_1')

    await server.close()
  })
})
