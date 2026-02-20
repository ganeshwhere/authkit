import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { config } from '../../config'
import { generateTokenHash } from '../../utils/crypto'
import { Errors } from '../../utils/errors'
import {
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex < 0) {
        return cookies
      }

      const name = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()

      cookies[name] = value
      return cookies
    }, {})
}

function getRefreshToken(request: FastifyRequest): string {
  const cookieHeader = request.headers.cookie
  const cookiesFromHeader = parseCookieHeader(cookieHeader)
  const cookieToken =
    (request.cookies && request.cookies.refresh_token) || cookiesFromHeader.refresh_token

  if (!cookieToken) {
    throw Errors.INVALID_REFRESH_TOKEN()
  }

  return cookieToken
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const refreshToken = getRefreshToken(request)
  const refreshTokenHash = generateTokenHash(refreshToken)

  const existingSession = await request.server.dbAdapter.getSessionByTokenHash(refreshTokenHash)

  if (!existingSession) {
    throw Errors.INVALID_REFRESH_TOKEN()
  }

  if (existingSession.revokedAt) {
    throw Errors.INVALID_REFRESH_TOKEN()
  }

  if (existingSession.expiresAt.getTime() <= Date.now()) {
    throw Errors.SESSION_EXPIRED()
  }

  const user = await request.server.dbAdapter.getUserById(existingSession.projectId, existingSession.userId)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  await request.server.dbAdapter.revokeSession(existingSession.tokenHash)

  const nextRefresh = issueRefreshToken(32)
  const nextSession = await request.server.dbAdapter.createSession({
    userId: existingSession.userId,
    projectId: existingSession.projectId,
    tokenHash: nextRefresh.tokenHash,
    tokenFamily: existingSession.tokenFamily,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    expiresAt: existingSession.expiresAt,
  })

  const accessToken = await issueAccessToken({
    context: {
      userId: user.id,
      sessionId: nextSession.id,
      projectId: user.projectId,
      email: user.email,
      emailVerified: user.emailVerified,
      issuer: config.baseUrl,
    },
    ttlSeconds: config.accessTokenTtlSeconds,
    privateKey: createPrivateKey(config.jwtPrivateKey),
  })

  setRefreshTokenCookie(reply, nextRefresh.token, config.nodeEnv === 'production')

  reply.send({
    data: {
      accessToken,
      session: nextSession,
    },
    error: null,
  })
}
