import { generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { hashPassword } from '../src/utils/crypto'
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
    getUserByEmail: vi.fn(async () => null),
    getPasswordHash: vi.fn(async () => null),
    getMFA: vi.fn(async () => null),
    createSession: vi.fn(async () => ({
      id: 'session_1',
      userId: 'user_1',
      projectId: 'project_1',
      tokenHash: 'hash',
      tokenFamily: 'family',
      ipAddress: null,
      userAgent: null,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
      createdAt: new Date(),
    })),
    ...overrides,
  }
}

describe('POST /v1/auth/signin', () => {
  it('returns INVALID_CREDENTIALS for unknown email', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signin',
      headers: { 'x-authkit-project-id': 'project_1' },
      payload: { email: 'missing@example.com', password: 'Password#123' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS')

    await server.close()
  })

  it('returns INVALID_CREDENTIALS for wrong password', async () => {
    const hashed = await hashPassword('CorrectPassword#123')

    const server = Fastify()
    server.decorate(
      'dbAdapter',
      createAdapter({
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
        getPasswordHash: vi.fn(async () => hashed),
      }) as never,
    )
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signin',
      headers: { 'x-authkit-project-id': 'project_1' },
      payload: { email: 'user@example.com', password: 'WrongPassword#123' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS')

    await server.close()
  })

  it('returns MFA challenge when mfa is enabled', async () => {
    const hashed = await hashPassword('CorrectPassword#123')

    const server = Fastify()
    server.decorate(
      'dbAdapter',
      createAdapter({
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
        getPasswordHash: vi.fn(async () => hashed),
        getMFA: vi.fn(async () => ({ encryptedSecret: 'enc', hashedBackupCodes: [] })),
      }) as never,
    )
    server.decorate('cache', createCache())
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signin',
      headers: { 'x-authkit-project-id': 'project_1' },
      payload: { email: 'user@example.com', password: 'CorrectPassword#123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.mfaRequired).toBe(true)
    expect(typeof response.json().data.mfaToken).toBe('string')

    await server.close()
  })
})
