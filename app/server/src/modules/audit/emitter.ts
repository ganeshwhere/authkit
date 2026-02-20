import type { FastifyInstance, FastifyRequest } from 'fastify'

export const auditEventCatalog = [
  'user.created',
  'user.updated',
  'user.deleted',
  'user.signed_in',
  'user.signed_out',
  'session.created',
  'session.revoked',
  'session.compromised',
  'oauth.connected',
  'oauth.disconnected',
  'passkey.registered',
  'passkey.removed',
  'mfa.enabled',
  'mfa.disabled',
  'password.changed',
  'password.reset',
  'email.verified',
] as const

export type AuditEventName = (typeof auditEventCatalog)[number]

export type AuditEventInput = {
  projectId: string
  event: AuditEventName | (string & {})
  userId?: string
  metadata?: Record<string, unknown>
  request?: FastifyRequest
}

export async function emitAuditEvent(
  server: FastifyInstance,
  input: AuditEventInput,
): Promise<void> {
  await server.dbAdapter.createAuditLog({
    projectId: input.projectId,
    userId: input.userId,
    event: input.event,
    ipAddress: input.request?.ip,
    userAgent: input.request?.headers['user-agent'] as string | undefined,
    metadata: input.metadata ?? {},
  })
}
