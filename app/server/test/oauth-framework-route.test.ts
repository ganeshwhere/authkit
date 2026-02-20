import { generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, describe, expect, it } from 'vitest'

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
  process.env.OAUTH_REDIRECT_ALLOWLIST = 'https://app.example.com/callback'
  process.env.OAUTH_GOOGLE_CLIENT_ID = 'google-client-id'
  process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'google-client-secret'
  delete process.env.OAUTH_GITHUB_CLIENT_ID
  delete process.env.OAUTH_GITHUB_CLIENT_SECRET

  authRoutes = (await import('../src/routes/auth')).default
})

function createCache() {
  const store = new Map<string, string>()

  return {
    store,
    cache: {
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
    },
  }
}

describe('OAuth route framework', () => {
  it('rejects redirect URLs outside allowlist', async () => {
    const { cache } = createCache()
    const server = Fastify()

    server.decorate('dbAdapter', {} as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google?redirectUrl=https://evil.example.com/cb',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVALID_REDIRECT_URI')

    await server.close()
  })

  it('creates OAuth state and redirects to provider authorize URL', async () => {
    const { cache, store } = createCache()
    const server = Fastify()

    server.decorate('dbAdapter', {} as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google?redirectUrl=https://app.example.com/callback&state=client-state',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(302)

    const location = response.headers.location
    expect(location).toBeTruthy()

    const authorizeUrl = new URL(location as string)
    expect(authorizeUrl.origin).toBe('https://accounts.google.com')
    expect(authorizeUrl.searchParams.get('client_id')).toBe('google-client-id')

    const state = authorizeUrl.searchParams.get('state')
    expect(state).toBeTruthy()

    const cachedState = store.get(`oauth:state:${state}`)
    expect(cachedState).toBeTruthy()

    await server.close()
  })

  it('consumes OAuth state in callback and prevents replay', async () => {
    const { cache } = createCache()
    const server = Fastify()

    server.decorate('dbAdapter', {} as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const begin = await server.inject({
      method: 'GET',
      url: '/v1/auth/oauth/google?redirectUrl=https://app.example.com/callback&state=client-state',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
    })

    const authorizeUrl = new URL(begin.headers.location as string)
    const state = authorizeUrl.searchParams.get('state')

    expect(state).toBeTruthy()

    const callback = await server.inject({
      method: 'GET',
      url: `/v1/auth/oauth/google/callback?code=oauth-code&state=${state}`,
    })

    expect(callback.statusCode).toBe(302)

    const callbackTarget = new URL(callback.headers.location as string)
    expect(callbackTarget.origin).toBe('https://app.example.com')
    expect(callbackTarget.searchParams.get('oauth_code')).toBe('oauth-code')
    expect(callbackTarget.searchParams.get('state')).toBe('client-state')

    const replay = await server.inject({
      method: 'GET',
      url: `/v1/auth/oauth/google/callback?code=oauth-code&state=${state}`,
    })

    expect(replay.statusCode).toBe(400)
    expect(replay.json().error.code).toBe('INVALID_OAUTH_STATE')

    await server.close()
  })

  it('returns provider-not-configured for missing credentials', async () => {
    const { cache } = createCache()
    const server = Fastify()

    server.decorate('dbAdapter', {} as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'GET',
      url: '/v1/auth/oauth/github?redirectUrl=https://app.example.com/callback',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('OAUTH_PROVIDER_NOT_CONFIGURED')

    await server.close()
  })
})
