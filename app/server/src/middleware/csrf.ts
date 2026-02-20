import { randomBytes, timingSafeEqual } from 'node:crypto'

import cookie from '@fastify/cookie'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { Errors } from '../utils/errors'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function shouldValidateCsrf(request: FastifyRequest): boolean {
  return !SAFE_METHODS.has(request.method) && request.url.startsWith('/v1/auth')
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

const csrfMiddleware: FastifyPluginAsync = async (server) => {
  await server.register(cookie)

  server.addHook('onRequest', async (request, reply) => {
    const existing = request.cookies[CSRF_COOKIE_NAME]

    if (!existing) {
      const token = randomBytes(32).toString('base64url')

      reply.setCookie(CSRF_COOKIE_NAME, token, {
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
      })
    }
  })

  server.addHook('preHandler', async (request) => {
    if (!shouldValidateCsrf(request)) {
      return
    }

    const cookieToken = request.cookies[CSRF_COOKIE_NAME]
    const headerToken = request.headers[CSRF_HEADER_NAME]

    const normalizedHeaderToken =
      typeof headerToken === 'string' ? headerToken : Array.isArray(headerToken) ? headerToken[0] : undefined

    if (!cookieToken || !normalizedHeaderToken) {
      throw Errors.INVALID_CSRF_TOKEN()
    }

    if (!constantTimeEqual(cookieToken, normalizedHeaderToken)) {
      throw Errors.INVALID_CSRF_TOKEN()
    }
  })
}

export default fp(csrfMiddleware, { name: 'csrf' })
