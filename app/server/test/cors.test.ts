import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('corsPlugin', () => {
  it('allows configured origins', async () => {
    vi.stubEnv('BASE_URL', 'https://api.authkit.dev')
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('JWT_PRIVATE_KEY', 'private')
    vi.stubEnv('JWT_PUBLIC_KEY', 'public')
    vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64))
    vi.stubEnv('HMAC_SECRET', 'x'.repeat(32))
    vi.stubEnv('CORS_ORIGINS', 'https://app.example.com')

    const { default: corsPlugin } = await import('../src/plugins/cors')

    const server = Fastify()
    await server.register(corsPlugin)
    server.get('/check', async () => ({ ok: true }))

    const res = await server.inject({
      method: 'GET',
      url: '/check',
      headers: { origin: 'https://app.example.com' },
    })

    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com')
    await server.close()
  })

  it('rejects origins outside the allowlist', async () => {
    vi.stubEnv('BASE_URL', 'https://api.authkit.dev')
    vi.stubEnv('DATABASE_URL', 'postgres://x')
    vi.stubEnv('JWT_PRIVATE_KEY', 'private')
    vi.stubEnv('JWT_PUBLIC_KEY', 'public')
    vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64))
    vi.stubEnv('HMAC_SECRET', 'x'.repeat(32))
    vi.stubEnv('CORS_ORIGINS', 'https://app.example.com')

    const { default: corsPlugin } = await import('../src/plugins/cors')

    const server = Fastify()
    await server.register(corsPlugin)
    server.get('/check', async () => ({ ok: true }))

    const res = await server.inject({
      method: 'GET',
      url: '/check',
      headers: { origin: 'https://evil.example.com' },
    })

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
    await server.close()
  })
})
