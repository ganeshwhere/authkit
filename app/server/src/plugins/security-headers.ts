import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const securityHeadersPlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(securityHeadersPlugin, { name: 'security-headers' })
