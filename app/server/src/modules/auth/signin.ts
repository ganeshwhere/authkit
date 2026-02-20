import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { generateSecureToken, verifyPassword } from '../../utils/crypto'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'

const signinBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
})

function getProjectId(request: FastifyRequest): string {
  const headerValue = request.headers['x-authkit-project-id']

  if (!headerValue || typeof headerValue !== 'string') {
    throw Errors.PROJECT_ID_REQUIRED()
  }

  return headerValue
}

export async function signinHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = getProjectId(request)
  const parsed = signinBodySchema.parse(request.body)

  const email = parsed.email.trim().toLowerCase()

  const user = await request.server.dbAdapter.getUserByEmail(projectId, email)

  if (!user) {
    throw Errors.INVALID_CREDENTIALS()
  }

  if (user.bannedAt) {
    throw Errors.ACCOUNT_BANNED()
  }

  const passwordHash = await request.server.dbAdapter.getPasswordHash(user.id)

  if (!passwordHash) {
    throw Errors.INVALID_CREDENTIALS()
  }

  const passwordValid = await verifyPassword(parsed.password, passwordHash)

  if (!passwordValid) {
    throw Errors.INVALID_CREDENTIALS()
  }

  const mfa = await request.server.dbAdapter.getMFA(user.id)

  if (mfa) {
    const mfaToken = generateSecureToken(24)

    await request.server.cache.set(
      `mfa:pending:${mfaToken}`,
      JSON.stringify({ userId: user.id, projectId }),
      600,
    )

    reply.send({
      data: {
        mfaRequired: true,
        mfaToken,
      },
      error: null,
    })
    return
  }

  const refresh = issueRefreshToken(32)
  const tokenFamily = createTokenFamilyId()
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000)

  const session = await request.server.dbAdapter.createSession({
    userId: user.id,
    projectId,
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
      projectId,
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
      session,
    },
    error: null,
  })
}
