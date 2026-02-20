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

async function createToken(): Promise<string> {
  return signAccessToken(
    {
      sub: 'user_1',
      sid: 'session_1',
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
    getUserById: vi.fn(async () => ({
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
    getOAuthAccountsByUserId: vi.fn(async () => []),
    getMFA: vi.fn(async () => null),
    getPasskeysByUserId: vi.fn(async () => []),
    getSessionsByUserId: vi.fn(async () => []),
    updateUser: vi.fn(async () => ({
      id: 'user_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Updated User',
      avatarUrl: null,
      metadata: {},
      bannedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    deleteUser: vi.fn(async () => undefined),
    revokeAllUserSessions: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('/v1/user/me routes', () => {
  it('returns current user profile', async () => {
    const token = await createToken()
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/user/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.user.email).toBe('user@example.com')

    await server.close()
  })

  it('updates current user profile', async () => {
    const token = await createToken()
    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'PATCH',
      url: '/v1/user/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        displayName: 'Updated User',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.updateUser).toHaveBeenCalled()

    await server.close()
  })

  it('deletes account when confirmation is valid', async () => {
    const token = await createToken()
    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(userRoutes, { prefix: '/v1/user' })

    const response = await server.inject({
      method: 'DELETE',
      url: '/v1/user/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        confirmation: 'DELETE',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.deleteUser).toHaveBeenCalledWith('project_1', 'user_1')

    await server.close()
  })
})
