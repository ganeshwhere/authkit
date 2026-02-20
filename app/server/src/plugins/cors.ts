import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const corsPlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(corsPlugin, { name: 'cors' })
