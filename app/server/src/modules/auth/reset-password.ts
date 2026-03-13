import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { generateTokenHash, hashPassword } from '../../utils/crypto'
import { Errors } from '../../utils/errors'

import { evaluatePasswordPolicy } from './password-policy'

const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export async function resetPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = resetPasswordBodySchema.parse(request.body)

  const passwordPolicy = evaluatePasswordPolicy(parsed.newPassword)

  if (!passwordPolicy.valid) {
    throw Errors.WEAK_PASSWORD(passwordPolicy.score)
  }

  const tokenHash = generateTokenHash(parsed.token)

  const token = await request.server.dbAdapter.getVerificationToken(tokenHash, 'password_reset')

  if (!token) {
    throw Errors.INVALID_TOKEN()
  }

  if (token.usedAt) {
    throw Errors.TOKEN_ALREADY_USED()
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    throw Errors.TOKEN_EXPIRED()
  }

  if (!token.userId) {
    throw Errors.INVALID_TOKEN()
  }

  const hash = await hashPassword(parsed.newPassword)

  await request.server.dbAdapter.setPassword(token.userId, hash)
  await request.server.dbAdapter.markTokenUsed(tokenHash)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
