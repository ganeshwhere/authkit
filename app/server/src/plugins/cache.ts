import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const cachePlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(cachePlugin, { name: 'cache' })
