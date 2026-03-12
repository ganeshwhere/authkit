import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import csrfMiddleware from '../src/middleware/csrf'

describe('csrf middleware', () => {
  it('sets csrf cookie on first request', async () => {
    const server = Fastify()
    await server.register(csrfMiddleware)
    server.get('/v1/auth/ping', async () => ({ ok: true }))

    const res = await server.inject({ method: 'GET', url: '/v1/auth/ping' })
    const cookies = res.headers['set-cookie']

    expect(cookies).toBeDefined()

    await server.close()
  })

  it('allows non-get auth route with valid token pair', async () => {
    const server = Fastify()
    await server.register(csrfMiddleware)
    server.get('/v1/auth/ping', async () => ({ ok: true }))
    server.post('/v1/auth/refresh', async () => ({ ok: true }))

    const first = await server.inject({ method: 'GET', url: '/v1/auth/ping' })
    const setCookie = first.headers['set-cookie']
    const csrfCookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie) ?? ''
    expect(csrfCookie).toBeTruthy()
    const token = csrfCookie.split(';')[0]?.split('=')[1]

    const second = await server.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        cookie: csrfCookie,
        'x-csrf-token': token,
      },
    })

    expect(second.statusCode).toBe(200)
    await server.close()
  })

  it('rejects non-get auth route without matching csrf tokens', async () => {
    const server = Fastify()
    await server.register(csrfMiddleware)
    server.get('/v1/auth/ping', async () => ({ ok: true }))
    server.post('/v1/auth/refresh', async () => ({ ok: true }))

    const first = await server.inject({ method: 'GET', url: '/v1/auth/ping' })
    const setCookie = first.headers['set-cookie']
    const csrfCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie ?? ''

    const second = await server.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: {
        cookie: csrfCookie,
      },
    })

    expect(second.statusCode).toBe(403)
    await server.close()
  })
})
