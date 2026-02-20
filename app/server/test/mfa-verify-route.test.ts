import { generateKeyPairSync } from 'node:crypto'

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

function createCache(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))

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
    getMFA: vi.fn(async () => ({ encryptedSecret: 'enc', hashedBackupCodes: [] })),
    createSession: vi.fn(async () => ({
      id: 'session_1',
      userId: 'user_1',
      projectId: 'project_1',
      tokenHash: 'hash_1',
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

describe('POST /v1/auth/mfa/verify', () => {
  it('rejects invalid mfa token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: {
        mfaToken: 'missing',
        code: '000000',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_MFA_TOKEN')

    await server.close()
  })

  it('rejects invalid mfa code', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.decorate(
      'cache',
      createCache({
        'mfa:pending:pending-token': JSON.stringify({ userId: 'user_1', projectId: 'project_1' }),
      }),
    )
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: {
        mfaToken: 'pending-token',
        code: '111111',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_MFA_CODE')

    await server.close()
  })

  it('returns user and access token on valid mfa verification', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.decorate(
      'cache',
      createCache({
        'mfa:pending:pending-token': JSON.stringify({ userId: 'user_1', projectId: 'project_1' }),
      }),
    )
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: {
        mfaToken: 'pending-token',
        code: '000000',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.email).toBe('user@example.com')
    expect(typeof response.json().data.accessToken).toBe('string')

    await server.close()
  })
})
