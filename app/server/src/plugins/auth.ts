import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import csrfMiddleware from '../middleware/csrf'

const authPlugin: FastifyPluginAsync = async (server) => {
  await server.register(csrfMiddleware)
}

export default fp(authPlugin, { name: 'auth' })
