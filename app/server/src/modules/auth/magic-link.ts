import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { generateSecureToken, generateTokenHash } from '../../utils/crypto'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'

const magicLinkSendBodySchema = z.object({
  email: z.string().email().max(255),
})

const magicLinkVerifyQuerySchema = z.object({
  token: z.string().min(1),
})

function getProjectId(request: FastifyRequest): string {
  const headerValue = request.headers['x-authkit-project-id']

  if (!headerValue || typeof headerValue !== 'string') {
    throw Errors.PROJECT_ID_REQUIRED()
  }

  return headerValue
}

export async function magicLinkSendHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = getProjectId(request)
  const parsed = magicLinkSendBodySchema.parse(request.body)
  const email = parsed.email.trim().toLowerCase()

  const user = await request.server.dbAdapter.getUserByEmail(projectId, email)

  const rawToken = generateSecureToken(32)

  await request.server.dbAdapter.createVerificationToken({
    projectId,
    userId: user?.id,
    email,
    tokenHash: generateTokenHash(rawToken),
    type: 'magic_link',
    expiresAt: new Date(Date.now() + config.magicLinkTtlSeconds * 1000),
  })

  request.log.info(
    {
      event: 'magic_link.sent',
      projectId,
      email,
    },
    'Magic link token generated',
  )

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function magicLinkVerifyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = magicLinkVerifyQuerySchema.parse(request.query)
  const tokenHash = generateTokenHash(parsed.token)

  const token = await request.server.dbAdapter.getVerificationToken(tokenHash, 'magic_link')

  if (!token) {
    throw Errors.INVALID_TOKEN()
  }

  if (token.usedAt) {
    throw Errors.TOKEN_ALREADY_USED()
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    throw Errors.TOKEN_EXPIRED()
  }

  let user = token.userId
    ? await request.server.dbAdapter.getUserById(token.projectId, token.userId)
    : null

  if (!user) {
    user = await request.server.dbAdapter.createUser(token.projectId, {
      email: token.email,
      emailVerified: true,
    })
  }

  await request.server.dbAdapter.markTokenUsed(tokenHash)

  const refresh = issueRefreshToken(32)
  const tokenFamily = createTokenFamilyId()
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000)

  const session = await request.server.dbAdapter.createSession({
    userId: user.id,
    projectId: token.projectId,
    tokenHash: refresh.tokenHash,
    tokenFamily,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    expiresAt,
  })

  const accessToken = await issueAccessToken({
    context: {
      userId: user.id,
      sessionId: session.id,
      projectId: token.projectId,
      email: user.email,
      emailVerified: user.emailVerified,
      issuer: config.baseUrl,
    },
    ttlSeconds: config.accessTokenTtlSeconds,
    privateKey: createPrivateKey(config.jwtPrivateKey),
  })

  setRefreshTokenCookie(reply, refresh.token, config.nodeEnv === 'production')

  reply.send({
    data: {
      user,
      accessToken,
    },
    error: null,
  })
}
