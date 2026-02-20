import type { FastifyPluginAsync } from 'fastify'

const managementRoutes: FastifyPluginAsync = async (server) => {
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default managementRoutes
