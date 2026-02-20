import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'

import securityHeadersPlugin from '../src/plugins/security-headers'

describe('securityHeadersPlugin', () => {
  it('sets security headers on responses', async () => {
    const server = Fastify()

    await server.register(securityHeadersPlugin)
    server.get('/v1/auth/ping', async () => ({ ok: true }))

    const res = await server.inject({ method: 'GET', url: '/v1/auth/ping' })

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['content-security-policy']).toBe("default-src 'none'")
    expect(res.headers['cache-control']).toBe('no-store')

    await server.close()
  })
})
