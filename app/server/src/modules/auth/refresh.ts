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

type UsedRefreshMarker = {
  tokenFamily: string
  userId: string
  projectId: string
}

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

function parseUsedMarker(value: string | null): UsedRefreshMarker | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as UsedRefreshMarker

    if (!parsed.tokenFamily || !parsed.projectId || !parsed.userId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

async function handleReuseDetection(
  request: FastifyRequest,
  marker: UsedRefreshMarker,
): Promise<never> {
  await request.server.dbAdapter.revokeSessionFamily(marker.tokenFamily)

  await request.server.dbAdapter.createAuditLog({
    projectId: marker.projectId,
    userId: marker.userId,
    event: 'session.compromised',
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    metadata: {
      reason: 'refresh_token_reuse_detected',
    },
  })

  if (typeof request.server.emitWebhookEvent === 'function') {
    try {
      await request.server.emitWebhookEvent({
        type: 'session.compromised',
        projectId: marker.projectId,
        data: {
          user: {
            id: marker.userId,
          },
          reason: 'refresh_token_reuse_detected',
        },
      })
    } catch (error) {
      request.log.warn({ error }, 'Failed to enqueue compromised session webhook event')
    }
  }

  throw Errors.TOKEN_REUSE_DETECTED()
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const refreshToken = getRefreshToken(request)
  const refreshTokenHash = generateTokenHash(refreshToken)

  const existingSession = await request.server.dbAdapter.getSessionByTokenHash(refreshTokenHash)

  if (!existingSession) {
    const markerRaw = await request.server.cache.get(`session:used_refresh:${refreshTokenHash}`)
    const marker = parseUsedMarker(markerRaw)

    if (marker) {
      await handleReuseDetection(request, marker)
    }

    throw Errors.INVALID_REFRESH_TOKEN()
  }

  if (existingSession.revokedAt) {
    await handleReuseDetection(request, {
      tokenFamily: existingSession.tokenFamily,
      userId: existingSession.userId,
      projectId: existingSession.projectId,
    })
  }

  if (existingSession.expiresAt.getTime() <= Date.now()) {
    throw Errors.SESSION_EXPIRED()
  }

  const user = await request.server.dbAdapter.getUserById(existingSession.projectId, existingSession.userId)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  await request.server.dbAdapter.revokeSession(existingSession.tokenHash)

  await request.server.cache.set(
    `session:used_refresh:${existingSession.tokenHash}`,
    JSON.stringify({
      tokenFamily: existingSession.tokenFamily,
      userId: existingSession.userId,
      projectId: existingSession.projectId,
    }),
    config.sessionDurationSeconds,
  )

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
