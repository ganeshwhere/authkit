import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { checkSlidingWindowLimit } from '../middleware/rate-limit'
import { Errors } from '../utils/errors'

type RatePolicy = {
  key: string
  maxRequests: number
  windowSeconds: number
  identifier: (request: FastifyRequest) => string | null
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function readBodyValue(request: FastifyRequest, field: string): unknown {
  const body = request.body

  if (!body || typeof body !== 'object') {
    return undefined
  }

  return (body as Record<string, unknown>)[field]
}

const policies: ReadonlyArray<RatePolicy> = [
  {
    key: 'signup',
    maxRequests: 5,
    windowSeconds: 3600,
    identifier: (request) => request.ip,
  },
  {
    key: 'signin',
    maxRequests: 10,
    windowSeconds: 900,
    identifier: (request) => request.ip,
  },
  {
    key: 'magic-link-send',
    maxRequests: 3,
    windowSeconds: 3600,
    identifier: (request) => normalizeEmail(readBodyValue(request, 'email')),
  },
  {
    key: 'forgot-password',
    maxRequests: 3,
    windowSeconds: 3600,
    identifier: (request) => normalizeEmail(readBodyValue(request, 'email')),
  },
  {
    key: 'mfa-verify',
    maxRequests: 10,
    windowSeconds: 900,
    identifier: (request) => {
      const value = readBodyValue(request, 'mfaToken')
      return typeof value === 'string' ? value : null
    },
  },
  {
    key: 'refresh',
    maxRequests: 60,
    windowSeconds: 3600,
    identifier: (request) => request.ip,
  },
]

function getPolicy(request: FastifyRequest): RatePolicy | null {
  const method = request.method
  const route = request.routeOptions.url

  if (method === 'POST' && route === '/v1/auth/signup') {
    return policies.find((policy) => policy.key === 'signup') ?? null
  }

  if (method === 'POST' && route === '/v1/auth/signin') {
    return policies.find((policy) => policy.key === 'signin') ?? null
  }

  if (method === 'POST' && route === '/v1/auth/magic-link/send') {
    return policies.find((policy) => policy.key === 'magic-link-send') ?? null
  }

  if (method === 'POST' && route === '/v1/auth/forgot-password') {
    return policies.find((policy) => policy.key === 'forgot-password') ?? null
  }

  if (method === 'POST' && route === '/v1/auth/mfa/verify') {
    return policies.find((policy) => policy.key === 'mfa-verify') ?? null
  }

  if (method === 'POST' && route === '/v1/auth/refresh') {
    return policies.find((policy) => policy.key === 'refresh') ?? null
  }

  return null
}

async function sendRateLimitError(
  reply: FastifyReply,
  error: ReturnType<typeof Errors.RATE_LIMIT_EXCEEDED> | ReturnType<typeof Errors.ACCOUNT_LOCKED>,
  retryAfterSeconds: number,
): Promise<void> {
  reply.header('retry-after', String(retryAfterSeconds))
  reply.code(error.statusCode).send({
    data: null,
    error: {
      code: error.code,
      message: error.message,
      details: {
        retryAfterSeconds,
      },
    },
  })
}

const rateLimiterPlugin: FastifyPluginAsync = async (server) => {
  server.addHook('preHandler', async (request, reply) => {
    const policy = getPolicy(request)

    if (!policy) {
      return
    }

    const identifier = policy.identifier(request)

    if (!identifier) {
      return
    }

    if (policy.key === 'signin') {
      const email = normalizeEmail(readBodyValue(request, 'email'))

      if (email) {
        const lockKey = `rate_limit:signin:lock:${email}`
        const isLocked = await server.cache.exists(lockKey)

        if (isLocked) {
          await sendRateLimitError(reply, Errors.ACCOUNT_LOCKED(), 900)
          return
        }
      }
    }

    const result = await checkSlidingWindowLimit({
      cache: server.cache,
      key: `rate_limit:${policy.key}:${identifier}`,
      maxRequests: policy.maxRequests,
      windowSeconds: policy.windowSeconds,
    })

    if (!result.allowed) {
      await sendRateLimitError(reply, Errors.RATE_LIMIT_EXCEEDED(), result.retryAfterSeconds)
      return
    }
  })

  server.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'POST' || request.routeOptions.url !== '/v1/auth/signin') {
      return
    }

    const email = normalizeEmail(readBodyValue(request, 'email'))

    if (!email) {
      return
    }

    const failKey = `rate_limit:signin:fail:${email}`
    const lockKey = `rate_limit:signin:lock:${email}`

    if (reply.statusCode >= 400) {
      const count = await server.cache.increment(failKey)
      await server.cache.expire(failKey, 900)

      if (count >= 5) {
        await server.cache.set(lockKey, '1', 900)
        await server.cache.delete(failKey)

        server.log.warn({ email, event: 'account.lockout' }, 'Signin account lockout triggered')
      }

      return
    }

    await server.cache.delete(failKey)
    await server.cache.delete(lockKey)
  })
}

export default fp(rateLimiterPlugin, { name: 'rate-limiter' })
