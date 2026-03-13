import { createPrivateKey, generateKeyPairSync } from 'node:crypto'

import Fastify from 'fastify'
import { authenticator } from 'otplib'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { encrypt, generateTokenHash } from '../src/utils/crypto'
import { globalErrorHandler } from '../src/utils/error-handler'
import { issueAccessToken } from '../src/utils/tokens'

const keyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

let authRoutes: (typeof import('../src/routes/auth'))['default']

function encryptSecret(secret: string): string {
  return encrypt(secret, Buffer.from('a'.repeat(64), 'hex'))
}

function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) =>
    generateTokenHash(code.replace(/\\s+/g, '').replace(/-/g, '').trim().toUpperCase()),
  )
}

beforeAll(async () => {
  process.env.BASE_URL = 'https://api.authkit.dev'
  process.env.DATABASE_URL = 'postgres://authkit:password@localhost:5432/authkit'
  process.env.JWT_PRIVATE_KEY = keyPair.privateKey
  process.env.JWT_PUBLIC_KEY = keyPair.publicKey
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.HMAC_SECRET = 'x'.repeat(32)

  authRoutes = (await import('../src/routes/auth')).default
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

function createAdapter(overrides: Record<string, unknown> = {}) {
  return {
    getUserById: vi.fn(async () => ({
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
    })),
    getMFA: vi.fn(async () => null),
    createMFASecret: vi.fn(async () => undefined),
    deleteMFA: vi.fn(async () => undefined),
    updateBackupCodes: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('MFA TOTP routes', () => {
  it('creates pending setup and returns secret, QR URL, and backup codes', async () => {
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
      url: '/v1/auth/mfa/totp/setup',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(typeof response.json().data.secret).toBe('string')
    expect(response.json().data.qrCodeUrl).toContain('otpauth://')
    expect(response.json().data.backupCodes).toHaveLength(8)
    expect(store.get('mfa:setup:user_1')).toBeTruthy()

    await server.close()
  })

  it('enables TOTP when code is valid for pending setup secret', async () => {
    const secret = authenticator.generateSecret()
    const pending = {
      encryptedSecret: encryptSecret(secret),
      hashedBackupCodes: hashBackupCodes(['AAAAA-AAAAA']),
      backupCodes: ['AAAAA-AAAAA'],
    }

    const { cache } = createCache({
      'mfa:setup:user_1': JSON.stringify(pending),
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
      url: '/v1/auth/mfa/totp/enable',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code: authenticator.generate(secret),
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.success).toBe(true)
    expect(adapter.createMFASecret).toHaveBeenCalledTimes(1)

    await server.close()
  })

  it('disables TOTP when current code is valid', async () => {
    const secret = authenticator.generateSecret()
    const encryptedSecret = encryptSecret(secret)

    const { cache } = createCache()
    const adapter = createAdapter({
      getMFA: vi.fn(async () => ({ encryptedSecret, hashedBackupCodes: [] })),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/mfa/totp/disable',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code: authenticator.generate(secret),
      },
    })

    expect(response.statusCode).toBe(200)
    expect(adapter.deleteMFA).toHaveBeenCalledWith('user_1')

    await server.close()
  })

  it('regenerates backup codes after valid verification code', async () => {
    const secret = authenticator.generateSecret()
    const encryptedSecret = encryptSecret(secret)

    const { cache } = createCache()
    const adapter = createAdapter({
      getMFA: vi.fn(async () => ({
        encryptedSecret,
        hashedBackupCodes: hashBackupCodes(['BBBBB-BBBBB']),
      })),
    })

    const server = Fastify()
    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const response = await server.inject({
      method: 'POST',
      url: '/v1/auth/mfa/backup-codes/regenerate',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        code: authenticator.generate(secret),
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.codes).toHaveLength(8)
    expect(adapter.updateBackupCodes).toHaveBeenCalledTimes(1)

    await server.close()
  })

  it('returns backup codes once and clears cache key', async () => {
    const { cache } = createCache({
      'mfa:backup:view:user_1': JSON.stringify(['CODE1', 'CODE2']),
    })

    const adapter = createAdapter()
    const server = Fastify()

    server.decorate('dbAdapter', adapter as never)
    server.decorate('cache', cache)
    server.setErrorHandler(globalErrorHandler)

    await server.register(authRoutes, { prefix: '/v1/auth' })

    const token = await createAccessToken()

    const first = await server.inject({
      method: 'GET',
      url: '/v1/auth/mfa/backup-codes',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(first.statusCode).toBe(200)
    expect(first.json().data.codes).toEqual(['CODE1', 'CODE2'])

    const second = await server.inject({
      method: 'GET',
      url: '/v1/auth/mfa/backup-codes',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(second.statusCode).toBe(200)
    expect(second.json().data.codes).toEqual([])

    await server.close()
  })
})
