import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { generateTokenHash } from '../../utils/crypto'
import { Errors } from '../../utils/errors'

const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
})

export async function verifyEmailHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = verifyEmailBodySchema.parse(request.body)
  const tokenHash = generateTokenHash(parsed.token)

  const token = await request.server.dbAdapter.getVerificationToken(tokenHash, 'email_verify')

  if (!token) {
    throw Errors.INVALID_TOKEN()
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    throw Errors.TOKEN_EXPIRED()
  }

  if (token.usedAt) {
    throw Errors.TOKEN_ALREADY_USED()
  }

  let user = token.userId
    ? await request.server.dbAdapter.getUserById(token.projectId, token.userId)
    : await request.server.dbAdapter.getUserByEmail(token.projectId, token.email)

  if (!user) {
    throw Errors.INVALID_TOKEN()
  }

  user = await request.server.dbAdapter.updateUser(token.projectId, user.id, {
    emailVerified: true,
  })

  await request.server.dbAdapter.markTokenUsed(tokenHash)

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}
