import type { FastifyPluginAsync } from 'fastify'

import { signupHandler } from '../modules/auth/signup'

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/signup', signupHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
