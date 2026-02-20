import { z } from 'zod'

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  TRUST_PROXY: z.coerce.boolean().default(false),
  BASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default(''),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_PUBLIC_KEY_PREVIOUS: z.string().optional(),
  ENCRYPTION_KEY: z.string().length(64),
  HMAC_SECRET: z.string().min(32),

  SESSION_DURATION_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  MAGIC_LINK_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  EMAIL_VERIFY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  EMAIL_FROM: z.string().email().default('auth@authkit.dev'),
  SMTP_URL: z.string().optional(),

  PWNED_PASSWORDS_CHECK: z.coerce.boolean().default(false),
  REQUIRE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
})

export type AppConfig = {
  port: number
  host: string
  nodeEnv: 'development' | 'test' | 'production'
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  trustProxy: boolean
  baseUrl: string
  corsOrigins: string[]
  databaseUrl: string
  databasePoolMin: number
  databasePoolMax: number
  redisUrl: string
  jwtPrivateKey: string
  jwtPublicKey: string
  jwtPublicKeyPrevious?: string
  encryptionKey: string
  hmacSecret: string
  sessionDurationSeconds: number
  accessTokenTtlSeconds: number
  magicLinkTtlSeconds: number
  passwordResetTtlSeconds: number
  emailVerifyTtlSeconds: number
  emailFrom: string
  smtpUrl?: string
  pwnedPasswordsCheck: boolean
  requireEmailVerification: boolean
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = configSchema.parse(env)

  return {
    port: parsed.PORT,
    host: parsed.HOST,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    trustProxy: parsed.TRUST_PROXY,
    baseUrl: parsed.BASE_URL,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    databaseUrl: parsed.DATABASE_URL,
    databasePoolMin: parsed.DATABASE_POOL_MIN,
    databasePoolMax: parsed.DATABASE_POOL_MAX,
    redisUrl: parsed.REDIS_URL,
    jwtPrivateKey: parsed.JWT_PRIVATE_KEY,
    jwtPublicKey: parsed.JWT_PUBLIC_KEY,
    jwtPublicKeyPrevious: parsed.JWT_PUBLIC_KEY_PREVIOUS,
    encryptionKey: parsed.ENCRYPTION_KEY,
    hmacSecret: parsed.HMAC_SECRET,
    sessionDurationSeconds: parsed.SESSION_DURATION_SECONDS,
    accessTokenTtlSeconds: parsed.ACCESS_TOKEN_TTL_SECONDS,
    magicLinkTtlSeconds: parsed.MAGIC_LINK_TTL_SECONDS,
    passwordResetTtlSeconds: parsed.PASSWORD_RESET_TTL_SECONDS,
    emailVerifyTtlSeconds: parsed.EMAIL_VERIFY_TTL_SECONDS,
    emailFrom: parsed.EMAIL_FROM,
    smtpUrl: parsed.SMTP_URL,
    pwnedPasswordsCheck: parsed.PWNED_PASSWORDS_CHECK,
    requireEmailVerification: parsed.REQUIRE_EMAIL_VERIFICATION,
  }
}

export const config = loadConfig(process.env)
