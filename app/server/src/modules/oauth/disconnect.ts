import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { requireAccessToken } from '../auth/access'
import { parseOAuthProvider } from './providers'
import { Errors } from '../../utils/errors'

const oauthParamsSchema = z.object({
  provider: z.string().min(1),
})

export async function oauthDisconnectHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const { provider } = oauthParamsSchema.parse(request.params)
  const providerId = parseOAuthProvider(provider)

  const linkedAccounts = await request.server.dbAdapter.getOAuthAccountsByUserId(auth.sub)
  const hasRequestedProvider = linkedAccounts.some((account) => account.provider === providerId)

  if (!hasRequestedProvider) {
    reply.send({
      data: {
        success: true,
      },
      error: null,
    })
    return
  }

  const [passwordHash, passkeys] = await Promise.all([
    request.server.dbAdapter.getPasswordHash(auth.sub),
    request.server.dbAdapter.getPasskeysByUserId(auth.sub),
  ])

  const hasOtherOAuth = linkedAccounts.some((account) => account.provider !== providerId)
  const hasPassword = Boolean(passwordHash)
  const hasPasskey = passkeys.length > 0

  if (!hasOtherOAuth && !hasPassword && !hasPasskey) {
    throw Errors.CANNOT_REMOVE_LAST_AUTH_METHOD()
  }

  await request.server.dbAdapter.deleteOAuthAccount(auth.sub, providerId)

  await request.server.dbAdapter.createAuditLog({
    projectId: auth.pid,
    userId: auth.sub,
    event: 'oauth.disconnected',
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    metadata: {
      provider: providerId,
    },
  })

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
