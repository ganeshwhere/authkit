import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { generateSecureToken, generateTokenHash } from '../../utils/crypto'
import { Errors } from '../../utils/errors'

const forgotPasswordBodySchema = z.object({
  email: z.string().email().max(255),
})

function getProjectId(request: FastifyRequest): string {
  const headerValue = request.headers['x-authkit-project-id']

  if (!headerValue || typeof headerValue !== 'string') {
    throw Errors.PROJECT_ID_REQUIRED()
  }

  return headerValue
}

export async function forgotPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = getProjectId(request)
  const parsed = forgotPasswordBodySchema.parse(request.body)
  const email = parsed.email.trim().toLowerCase()

  const user = await request.server.dbAdapter.getUserByEmail(projectId, email)

  if (user) {
    const rawToken = generateSecureToken(32)

    await request.server.dbAdapter.createVerificationToken({
      projectId,
      userId: user.id,
      email,
      tokenHash: generateTokenHash(rawToken),
      type: 'password_reset',
      expiresAt: new Date(Date.now() + config.passwordResetTtlSeconds * 1000),
    })

    request.log.info(
      {
        event: 'password_reset.requested',
        userId: user.id,
      },
      'Password reset token generated',
    )
  }

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
