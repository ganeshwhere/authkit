import type { FastifyPluginAsync } from 'fastify'

import {
  deleteSessionHandler,
  createWebhookHandler,
  deleteWebhookHandler,
  getAuditLogsHandler,
  listSessionsHandler,
  listWebhooksHandler,
  updateWebhookHandler,
} from '../modules/management/operations'
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

  server.get('/sessions', listSessionsHandler)
  server.delete('/sessions/:id', deleteSessionHandler)

  server.get('/audit-logs', getAuditLogsHandler)

  server.post('/webhooks', createWebhookHandler)
  server.get('/webhooks', listWebhooksHandler)
  server.patch('/webhooks/:id', updateWebhookHandler)
  server.delete('/webhooks/:id', deleteWebhookHandler)

  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default managementRoutes
