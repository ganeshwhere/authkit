import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { loadConfig } from '../src/config'

function baseEnv(overrides: Record<string, string | undefined> = {}): Record<string, string> {
  return {
    BASE_URL: 'https://api.authkit.dev',
    DATABASE_URL: 'postgres://authkit:password@localhost:5432/authkit',
    JWT_PRIVATE_KEY: 'private',
    JWT_PUBLIC_KEY: 'public',
    ENCRYPTION_KEY: 'a'.repeat(64),
    HMAC_SECRET: 'x'.repeat(32),
    ...overrides,
  }
}

describe('loadConfig', () => {
  it('parses required env and applies defaults', () => {
    const result = loadConfig(baseEnv())

    expect(result.port).toBe(3001)
    expect(result.host).toBe('0.0.0.0')
    expect(result.logLevel).toBe('info')
    expect(result.accessTokenTtlSeconds).toBe(900)
    expect(result.corsOrigins).toEqual([])
  })

  it('parses CORS origins list', () => {
    const result = loadConfig(
      baseEnv({ CORS_ORIGINS: 'https://a.example.com, https://b.example.com ' }),
    )

    expect(result.corsOrigins).toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('throws for invalid BASE_URL', () => {
    expect(() => loadConfig(baseEnv({ BASE_URL: 'bad-url' }))).toThrowError(ZodError)
  })

  it('throws for invalid encryption key length', () => {
    expect(() => loadConfig(baseEnv({ ENCRYPTION_KEY: 'short' }))).toThrowError(ZodError)
  })
})
