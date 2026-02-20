import type { FastifyPluginAsync } from 'fastify'

const systemRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async () => ({ data: { status: 'ok' }, error: null }))
}

export default systemRoutes
