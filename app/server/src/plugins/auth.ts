import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const authPlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(authPlugin, { name: 'auth' })
