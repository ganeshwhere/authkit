import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto'

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

  const { loadConfig } = await import('../src/config')
  const parsed = loadConfig(process.env)

  expect(parsed.baseUrl).toBe('https://api.authkit.dev')
  expect(createPrivateKey(parsed.jwtPrivateKey)).toBeDefined()
  expect(createPublicKey(parsed.jwtPublicKey)).toBeDefined()

  authRoutes = (await import('../src/routes/auth')).default
})

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getUserByEmail: vi.fn(async () => null),
    createUser: vi.fn(async () => ({
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
    setPassword: vi.fn(async () => undefined),
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

describe('POST /v1/auth/signup', () => {
  it('creates a user and returns session + access token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'user@example.com',
        password: 'StrongPassword#123',
        displayName: 'User',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data.user.email).toBe('user@example.com')

    await server.close()
  })

  it('rejects duplicate email', async () => {
    const server = Fastify()
    server.decorate(
      'dbAdapter',
      createAdapter({
        getUserByEmail: vi.fn(async () => ({ id: 'existing-user' })),
      }) as never,
    )
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'user@example.com',
        password: 'StrongPassword#123',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS')

    await server.close()
  })

  it('rejects weak password', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'user@example.com',
        password: '12345678',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('WEAK_PASSWORD')

    await server.close()
  })
})
