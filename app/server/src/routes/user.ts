import type { FastifyPluginAsync } from 'fastify'

import {
  deleteMeHandler,
  getMeHandler,
  patchMeHandler,
} from '../modules/users/me'

const userRoutes: FastifyPluginAsync = async (server) => {
  server.get('/me', getMeHandler)
  server.patch('/me', patchMeHandler)
  server.delete('/me', deleteMeHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default userRoutes
