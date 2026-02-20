import { describe, expect, it } from 'vitest'

import { createDatabasePoolConfig } from '../src/db'

describe('createDatabasePoolConfig', () => {
  it('maps config fields to pool options', () => {
    const poolConfig = createDatabasePoolConfig({
      port: 3001,
      host: '0.0.0.0',
      nodeEnv: 'development',
      logLevel: 'info',
      trustProxy: false,
      baseUrl: 'https://api.authkit.dev',
      corsOrigins: [],
      databaseUrl: 'postgres://authkit:password@localhost:5432/authkit',
      databasePoolMin: 2,
      databasePoolMax: 10,
      redisUrl: 'redis://localhost:6379',
      jwtPrivateKey: 'private',
      jwtPublicKey: 'public',
      encryptionKey: 'a'.repeat(64),
      hmacSecret: 'x'.repeat(32),
      sessionDurationSeconds: 2_592_000,
      accessTokenTtlSeconds: 900,
      magicLinkTtlSeconds: 900,
      passwordResetTtlSeconds: 3600,
      emailVerifyTtlSeconds: 86_400,
      emailFrom: 'auth@authkit.dev',
      smtpUrl: undefined,
      pwnedPasswordsCheck: false,
      requireEmailVerification: false,
    })

    expect(poolConfig.connectionString).toBe('postgres://authkit:password@localhost:5432/authkit')
    expect(poolConfig.min).toBe(2)
    expect(poolConfig.max).toBe(10)
    expect(poolConfig.ssl).toBe(false)
  })
})
