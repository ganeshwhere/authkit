import { createPublicKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { config } from '../../config'
import { verifyAccessToken } from '../../utils/crypto'
import { Errors } from '../../utils/errors'
import { clearRefreshTokenCookie } from '../../utils/tokens'

function getBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    throw Errors.UNAUTHORIZED()
  }

  return header.slice('Bearer '.length).trim()
}

export async function signoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = getBearerToken(request)

  const payload = await verifyAccessToken(token, createPublicKey(config.jwtPublicKey))

  const sessions = await request.server.dbAdapter.getSessionsByUserId(payload.sub)
  const session = sessions.find((candidate) => candidate.id === payload.sid)

  if (session) {
    await request.server.dbAdapter.revokeSession(session.tokenHash)
  }

  clearRefreshTokenCookie(reply, config.nodeEnv === 'production')

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
