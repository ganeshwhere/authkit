import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import {
  emitAuditEvent as emitAuditEventInternal,
  type AuditEventInput,
} from '../modules/audit/emitter'

const auditPlugin: FastifyPluginAsync = async (server) => {
  server.decorate('emitAuditEvent', async (input: AuditEventInput) => {
    try {
      await emitAuditEventInternal(server, input)
    } catch (error) {
      server.log.warn({ error, event: input.event }, 'Failed to persist audit event')
    }
  })
}

export default fp(auditPlugin, { name: 'audit' })
