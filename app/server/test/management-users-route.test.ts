import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { globalErrorHandler } from '../src/utils/error-handler'

let managementRoutes: (typeof import('../src/routes/management'))['default']

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = 'key'
  process.env.JWT_PUBLIC_KEY = 'key'
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'mgmt-secret-key-12345678901234567890'

  managementRoutes = (await import('../src/routes/management')).default
})

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    listUsers: vi.fn(async () => ({ users: [], total: 0 })),
    createUser: vi.fn(async () => ({
      id: 'user_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: false,
      displayName: null,
      avatarUrl: null,
      metadata: {},
      bannedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    getUserById: vi.fn(async () => null),
    updateUser: vi.fn(async () => ({
      id: 'user_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: false,
      displayName: null,
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

describe('/v1/api/users routes', () => {
  it('requires management secret', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(managementRoutes, { prefix: '/v1/api' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/api/users',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('FORBIDDEN')

    await server.close()
  })

  it('lists users for authorized management request', async () => {
    const adapter = createAdapter({
      listUsers: vi.fn(async () => ({
        users: [
          {
            id: 'user_1',
            projectId: 'project_1',
            email: 'user@example.com',
            emailVerified: false,
            displayName: null,
            avatarUrl: null,
            metadata: {},
            bannedAt: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      })),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(managementRoutes, { prefix: '/v1/api' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/api/users?limit=20&offset=0',
      headers: {
        'x-authkit-secret-key': 'mgmt-secret-key-12345678901234567890',
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.total).toBe(1)

    await server.close()
  })
})
