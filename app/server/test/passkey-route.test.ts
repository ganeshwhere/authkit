import { createPrivateKey, generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { issueAccessToken } from '../src/utils/tokens'
import { globalErrorHandler } from '../src/utils/error-handler'

const mockGenerateRegistrationOptions = vi.fn()
const mockVerifyRegistrationResponse = vi.fn()
const mockGenerateAuthenticationOptions = vi.fn()
const mockVerifyAuthenticationResponse = vi.fn()

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: mockGenerateRegistrationOptions,
  verifyRegistrationResponse: mockVerifyRegistrationResponse,
  generateAuthenticationOptions: mockGenerateAuthenticationOptions,
  verifyAuthenticationResponse: mockVerifyAuthenticationResponse,
}))

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

  authRoutes = (await import('../src/routes/auth')).default
})

beforeEach(() => {
  vi.clearAllMocks()

  mockGenerateRegistrationOptions.mockResolvedValue({
    challenge: 'reg-challenge',
    rp: { name: 'AuthKit', id: 'api.authkit.dev' },
  })

  mockVerifyRegistrationResponse.mockResolvedValue({
    verified: true,
    registrationInfo: {
      credentialID: Buffer.from('cred-id', 'utf8'),
      credentialPublicKey: Buffer.from('pub-key', 'utf8'),
      counter: 0,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: true,
    },
  })

  mockGenerateAuthenticationOptions.mockResolvedValue({
    challenge: 'auth-challenge',
    rpId: 'api.authkit.dev',
  })

  mockVerifyAuthenticationResponse.mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 9,
    },
  })
})

async function createAccessToken(): Promise<string> {
  return issueAccessToken({
    context: {
      userId: 'user_1',
      sessionId: 'session_1',
      projectId: 'project_1',
      email: 'user@example.com',
      emailVerified: true,
      issuer: 'https://api.authkit.dev',
    },
    ttlSeconds: 900,
    privateKey: createPrivateKey(keyPair.privateKey),
  })
}

function createCache(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))

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
        // no-op
      },
      async exists(key: string): Promise<boolean> {
        return store.has(key)
      },
    },
  }
}

function buildUser() {
  return {
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
  }
}

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getUserById: vi.fn(async () => buildUser()),
    getUserByEmail: vi.fn(async () => buildUser()),
    getPasskeysByUserId: vi.fn(async () => []),
    createPasskey: vi.fn(async () => undefined),
    updatePasskeyCounter: vi.fn(async () => undefined),
    createSession: vi.fn(async () => ({
      id: 'session_1',
      userId: 'user_1',
      projectId: 'project_1',
      tokenHash: 'hash',
      tokenFamily: 'family',
      ipAddress: null,
      userAgent: null,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    })),
    ...overrides,
  }
}

function encodeClientData(challenge: string): string {
  return Buffer.from(JSON.stringify({ challenge }), 'utf8').toString('base64url')
}

describe('passkey routes', () => {
  it('starts passkey registration and stores challenge', async () => {
    const { cache, store } = createCache()
    const adapter = createAdapter()

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/passkey/register/begin',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.options.challenge).toBe('reg-challenge')
    expect(store.get('passkey:challenge:reg-challenge')).toBeTruthy()

    await server.close()
  })

  it('completes passkey registration and persists credential metadata', async () => {
    const { cache } = createCache({
      'passkey:challenge:reg-challenge': JSON.stringify({
        type: 'registration',
        projectId: 'project_1',
        userId: 'user_1',
        challenge: 'reg-challenge',
      }),
    })

    const adapter = createAdapter()
    const server = Fastify()

    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/passkey/register/complete',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        credential: {
          id: Buffer.from('cred-id', 'utf8').toString('base64url'),
          response: {
            clientDataJSON: encodeClientData('reg-challenge'),
            transports: ['usb'],
          },
        },
        displayName: 'Laptop key',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.createPasskey).toHaveBeenCalledTimes(1)

    await server.close()
  })

  it('starts passkey authentication with project-aware challenge state', async () => {
    const { cache, store } = createCache()
    const adapter = createAdapter({
      getPasskeysByUserId: vi.fn(async () => [
        {
          id: 'pk_1',
          credentialId: Buffer.from('cred-id', 'utf8').toString('base64url'),
          publicKey: Buffer.from('pub-key', 'utf8').toString('base64url'),
          counter: 1,
          transports: ['usb'],
          displayName: 'Laptop key',
        },
      ]),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/passkey/authenticate/begin',
      headers: {
        'x-authkit-project-id': 'project_1',
      },
      payload: {
        email: 'user@example.com',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.options.challenge).toBe('auth-challenge')
    expect(store.get('passkey:challenge:auth-challenge')).toBeTruthy()

    await server.close()
  })

  it('completes passkey authentication and rotates session', async () => {
    const credentialId = Buffer.from('cred-id', 'utf8').toString('base64url')
    const publicKey = Buffer.from('pub-key', 'utf8').toString('base64url')

    const { cache } = createCache({
      'passkey:challenge:auth-challenge': JSON.stringify({
        type: 'authentication',
        projectId: 'project_1',
        userId: 'user_1',
        challenge: 'auth-challenge',
      }),
    })

    const adapter = createAdapter({
      getPasskeysByUserId: vi.fn(async () => [
        {
          id: 'pk_1',
          credentialId,
          publicKey,
          counter: 1,
          transports: ['usb'],
          displayName: 'Laptop key',
        },
      ]),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/passkey/authenticate/complete',
      payload: {
        credential: {
          id: credentialId,
          response: {
            clientDataJSON: encodeClientData('auth-challenge'),
            userHandle: Buffer.from('user_1', 'utf8').toString('base64url'),
          },
        },
      },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().data.accessToken).toBe('string')
    expect(adapter.updatePasskeyCounter).toHaveBeenCalledWith(credentialId, 9)

    await server.close()
  })
})
