import type { FastifyPluginAsync } from 'fastify'

import {
  banUserHandler,
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  revokeUserSessionsHandler,
  unbanUserHandler,
  updateUserHandler,
} from '../modules/management/users'

const managementRoutes: FastifyPluginAsync = async (server) => {
  server.get('/users', listUsersHandler)
  server.post('/users', createUserHandler)
  server.get('/users/:id', getUserHandler)
  server.patch('/users/:id', updateUserHandler)
  server.delete('/users/:id', deleteUserHandler)
  server.post('/users/:id/ban', banUserHandler)
  server.post('/users/:id/unban', unbanUserHandler)
  server.delete('/users/:id/sessions', revokeUserSessionsHandler)

  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default managementRoutes
