import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const rateLimiterPlugin: FastifyPluginAsync = async () => {
  // Endpoint-specific policy registration is added in a subsequent commit.
}

export default fp(rateLimiterPlugin, { name: 'rate-limiter' })
