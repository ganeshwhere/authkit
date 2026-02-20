import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import rateLimiterPlugin from '../src/plugins/rate-limiter'

function createMemoryCache() {
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
      // no-op for tests
    },
    async exists(key: string): Promise<boolean> {
      return store.has(key)
    },
  }
}

describe('rate limiter policies', () => {
  it('blocks signup after configured limit', async () => {
    const server = Fastify()
    server.decorate('cache', createMemoryCache())

    await server.register(rateLimiterPlugin)

    server.post('/v1/auth/signup', async () => ({ ok: true }))

    for (let i = 0; i < 5; i += 1) {
      const res = await server.inject({ method: 'POST', url: '/v1/auth/signup' })
      expect(res.statusCode).toBe(200)
    }

    const blocked = await server.inject({ method: 'POST', url: '/v1/auth/signup' })
    expect(blocked.statusCode).toBe(429)

    await server.close()
  })

  it('locks account after repeated signin failures', async () => {
    const server = Fastify()
    server.decorate('cache', createMemoryCache())

    await server.register(rateLimiterPlugin)

    server.post('/v1/auth/signin', async (_, reply) => {
      reply.status(401)
      return { data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid', details: {} } }
    })

    for (let i = 0; i < 5; i += 1) {
      const res = await server.inject({
        method: 'POST',
        url: '/v1/auth/signin',
        payload: { email: 'user@example.com', password: 'wrong-password' },
      })

      expect(res.statusCode).toBe(401)
    }

    const blocked = await server.inject({
      method: 'POST',
      url: '/v1/auth/signin',
      payload: { email: 'user@example.com', password: 'wrong-password' },
    })

    expect(blocked.statusCode).toBe(429)

    await server.close()
  })
})
