import type { FastifyReply, FastifyRequest } from 'fastify'

import { requireAccessToken } from '../auth/access'

export async function listSessionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const sessions = await request.server.dbAdapter.getSessionsByUserId(auth.sub)

  reply.send({
    data: {
      sessions,
    },
    error: null,
  })
}

export async function revokeSessionHandler(
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const sessions = await request.server.dbAdapter.getSessionsByUserId(auth.sub)

  const target = sessions.find((session) => session.id === request.params.sessionId)

  if (target) {
    await request.server.dbAdapter.revokeSession(target.tokenHash)
  }

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function revokeAllOtherSessionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const sessions = await request.server.dbAdapter.getSessionsByUserId(auth.sub)

  const revocations = sessions
    .filter((session) => session.id !== auth.sid)
    .map(async (session) => request.server.dbAdapter.revokeSession(session.tokenHash))

  await Promise.all(revocations)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
