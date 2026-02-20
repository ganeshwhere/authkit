import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { hashPassword } from '../../utils/crypto'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'
import { evaluatePasswordPolicy } from './password-policy'

const signupBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
})

function getProjectId(request: FastifyRequest): string {
  const headerValue = request.headers['x-authkit-project-id']

  if (!headerValue || typeof headerValue !== 'string') {
    throw Errors.PROJECT_ID_REQUIRED()
  }

  return headerValue
}

export async function signupHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = getProjectId(request)
  const parsed = signupBodySchema.parse(request.body)

  const email = parsed.email.trim().toLowerCase()

  const existingUser = await request.server.dbAdapter.getUserByEmail(projectId, email)

  if (existingUser) {
    throw Errors.EMAIL_ALREADY_EXISTS()
  }

  const passwordPolicy = evaluatePasswordPolicy(parsed.password)

  if (!passwordPolicy.valid) {
    throw Errors.WEAK_PASSWORD(passwordPolicy.score)
  }

  const user = await request.server.dbAdapter.createUser(projectId, {
    email,
    displayName: parsed.displayName?.trim(),
  })

  const passwordHash = await hashPassword(parsed.password)
  await request.server.dbAdapter.setPassword(user.id, passwordHash)

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

  reply.code(201).send({
    data: {
      user,
      accessToken,
      session,
    },
    error: null,
  })
}
