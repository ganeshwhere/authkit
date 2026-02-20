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
    getSessionsByUserId: vi.fn(async () => []),
    revokeSession: vi.fn(async () => undefined),
    getAuditLogs: vi.fn(async () => ({ logs: [], total: 0 })),
    createWebhookEndpoint: vi.fn(async () => ({
      id: 'webhook_1',
      projectId: 'project_1',
      url: 'https://example.com/webhook',
      secret: 'secret_12345678',
      events: ['user.created'],
      enabled: true,
      createdAt: new Date(),
    })),
    listWebhookEndpoints: vi.fn(async () => []),
    updateWebhookEndpoint: vi.fn(async () => ({
      id: 'webhook_1',
      projectId: 'project_1',
      url: 'https://example.com/webhook',
      secret: 'secret_12345678',
      events: ['user.created'],
      enabled: true,
      createdAt: new Date(),
    })),
    deleteWebhookEndpoint: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('/v1/api operational routes', () => {
  it('returns audit logs for authorized request', async () => {
    const adapter = createAdapter({
      getAuditLogs: vi.fn(async () => ({
        logs: [
          {
            id: 'log_1',
            projectId: 'project_1',
            userId: 'user_1',
            event: 'user.signed_in',
            ipAddress: '127.0.0.1',
            userAgent: 'test',
            metadata: {},
            createdAt: new Date(),
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
      url: '/v1/api/audit-logs?limit=20&offset=0',
      headers: {
        'x-authkit-secret-key': 'mgmt-secret-key-12345678901234567890',
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.total).toBe(1)

    await server.close()
  })

  it('creates webhook for authorized request', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(managementRoutes, { prefix: '/v1/api' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/api/webhooks',
      headers: {
        'x-authkit-secret-key': 'mgmt-secret-key-12345678901234567890',
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        url: 'https://example.com/webhook',
        secret: 'secret_12345678',
        events: ['user.created'],
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data.webhook.url).toBe('https://example.com/webhook')

    await server.close()
  })
})
