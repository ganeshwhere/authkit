import { generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import type { Pool, QueryResult } from 'pg'
import { beforeAll, describe, expect, it } from 'vitest'

let systemRoutes: (typeof import('../src/routes/system'))['default']

const keyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = keyPair.privateKey
  process.env.JWT_PUBLIC_KEY = keyPair.publicKey
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  systemRoutes = (await import('../src/routes/system')).default
})

describe('system routes', () => {
  it('returns jwks keys', async () => {
    const server = Fastify()
    const dbPool = {
      query: async (): Promise<QueryResult<{ ok: number }>> =>
        ({
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          rows: [{ ok: 1 }],
          fields: [],
        }) as QueryResult<{ ok: number }>,
    } as Pick<Pool, 'query'>
    const redis = {
      ping: async () => 'PONG',
    }

    server.decorate('dbPool', dbPool as Pool)
    server.decorate('redis', redis as never)

    await server.register(systemRoutes)

    const response = await server.inject({ method: 'GET', url: '/.well-known/jwks.json' })

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.json().data.keys)).toBe(true)

    await server.close()
  })

  it('returns ready status when dependencies are healthy', async () => {
    const server = Fastify()
    const dbPool = {
      query: async (): Promise<QueryResult<{ ok: number }>> =>
        ({
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          rows: [{ ok: 1 }],
          fields: [],
        }) as QueryResult<{ ok: number }>,
    } as Pick<Pool, 'query'>
    const redis = {
      ping: async () => 'PONG',
    }

    server.decorate('dbPool', dbPool as Pool)
    server.decorate('redis', redis as never)

    await server.register(systemRoutes)

    const response = await server.inject({ method: 'GET', url: '/ready' })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('ready')

    await server.close()
  })
})
