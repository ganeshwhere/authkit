import type { FastifyPluginAsync } from 'fastify'

import {
  deleteMeHandler,
  getMeHandler,
  patchMeHandler,
} from '../modules/users/me'
import {
  listSessionsHandler,
  revokeAllOtherSessionsHandler,
  revokeSessionHandler,
} from '../modules/users/sessions'

const userRoutes: FastifyPluginAsync = async (server) => {
  server.get('/me', getMeHandler)
  server.patch('/me', patchMeHandler)
  server.delete('/me', deleteMeHandler)

  server.get('/sessions', listSessionsHandler)
  server.delete('/sessions/:sessionId', revokeSessionHandler)
  server.delete('/sessions', revokeAllOtherSessionsHandler)

  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default userRoutes
