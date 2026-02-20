import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'

const mfaVerifyBodySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(1).max(20),
})

type PendingMfaPayload = {
  userId: string
  projectId: string
}

function parsePendingMfaPayload(value: string | null): PendingMfaPayload | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as PendingMfaPayload

    if (!parsed.userId || !parsed.projectId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function verifyMfaCode(code: string): boolean {
  // Full TOTP verification is implemented in the dedicated MFA phase.
  return code === '000000'
}

export async function mfaVerifyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = mfaVerifyBodySchema.parse(request.body)

  const pendingRaw = await request.server.cache.get(`mfa:pending:${parsed.mfaToken}`)
  const pending = parsePendingMfaPayload(pendingRaw)

  if (!pending) {
    throw Errors.INVALID_MFA_TOKEN()
  }

  const user = await request.server.dbAdapter.getUserById(pending.projectId, pending.userId)

  if (!user) {
    throw Errors.INVALID_MFA_TOKEN()
  }

  const mfa = await request.server.dbAdapter.getMFA(user.id)

  if (!mfa) {
    throw Errors.INVALID_MFA_TOKEN()
  }

  if (!verifyMfaCode(parsed.code)) {
    throw Errors.INVALID_MFA_CODE()
  }

  await request.server.cache.delete(`mfa:pending:${parsed.mfaToken}`)

  const refresh = issueRefreshToken(32)
  const tokenFamily = createTokenFamilyId()
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000)

  const session = await request.server.dbAdapter.createSession({
    userId: user.id,
    projectId: pending.projectId,
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
      projectId: pending.projectId,
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
