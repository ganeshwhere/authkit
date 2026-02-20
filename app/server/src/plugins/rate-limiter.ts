import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const rateLimiterPlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(rateLimiterPlugin, { name: 'rate-limiter' })
