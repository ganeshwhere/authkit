import type { FastifyPluginAsync } from 'fastify'

const authRoutes: FastifyPluginAsync = async (server) => {
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
