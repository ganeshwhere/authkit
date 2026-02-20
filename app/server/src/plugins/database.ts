import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const databasePlugin: FastifyPluginAsync = async () => {
  // Implemented in subsequent commits.
}

export default fp(databasePlugin, { name: 'database' })
