import Fastify from 'fastify'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { globalErrorHandler } from '../src/utils/error-handler'

let authRoutes: (typeof import('../src/routes/auth'))['default']

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEA0w+Lwd4nLlJqSM0f\n+Vf8EKJxxPZXhVmYzFl/ezfWQZ6gQ1f6EEPNxqE6E5srhFz9m2T8H+6h5rPc2IXB\n8oA8vQIDAQABAkEAwpP2vYko6gM+Ah7gR8vG9hJ2Q7y5kQeWrQ1N+Fu3+xW7B4wh\nOCC3f4GQLC2jefIm2NBE8xD1DbkQ4N2n8gXoAQIhAP6fq/Nr1m7FF4XkPkMxuR0Y\nFPNTQ39x5QgH5PX5K0nTAiEA1lS1Wgq5RqD1WyR4j9yyu8Q0n9wZ8M9BRdahT3/8\n6V0CIQCV2VY9Aqjv9UZqkQkA2mvT5a8lMlydTqQ3CQhP2qpQwQIhAJ8vF8PoAiXh\nX1Gy28g7U79+ypm6ErS5cLq6JxjNQ2RZAiEAjqwTuS3W+PBw0aGY4GIQyT3i4h4E\n9hKhf5xqL6p3nQ8=\n-----END PRIVATE KEY-----'
  process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANMPi8HeJy5SakjNH/lX/BCiccT2V4VZ\nmMxZf3s31kGeoENX+hBDzcahOhObK4Rc/Ztk/B/uoeaz3NiFwfKAPL0CAwEAAQ==\n-----END PUBLIC KEY-----'
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  authRoutes = (await import('../src/routes/auth')).default
})

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getUserByEmail: vi.fn(async () => null),
    createVerificationToken: vi.fn(async () => undefined),
    getVerificationToken: vi.fn(async () => null),
    setPassword: vi.fn(async () => undefined),
    markTokenUsed: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('password reset routes', () => {
  it('forgot-password always succeeds', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'unknown@example.com',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)

    await server.close()
  })

  it('reset-password rejects invalid token', async () => {
    const server = Fastify()
    server.decorate('dbAdapter', createAdapter() as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: {
        token: 'missing-token',
        newPassword: 'StrongPassword#123',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_TOKEN')

    await server.close()
  })

  it('reset-password updates password for valid token', async () => {
    const adapter = createAdapter({
      getVerificationToken: vi.fn(async () => ({
        id: 'token_1',
        projectId: 'project_1',
        userId: 'user_1',
        email: 'user@example.com',
        tokenHash: 'hash',
        type: 'password_reset',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      })),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: {
        token: 'valid-token',
        newPassword: 'StrongPassword#123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.setPassword).toHaveBeenCalled()
    expect(adapter.markTokenUsed).toHaveBeenCalled()

    await server.close()
  })
})
