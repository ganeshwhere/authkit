import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { AuthKitError } from '../../utils/errors'
import { requireManagementSecret, requireProjectIdHeader } from './auth'

const listSessionsQuerySchema = z.object({
  userId: z.string().min(1),
})

const deleteSessionQuerySchema = z.object({
  userId: z.string().min(1),
})

const auditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  event: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const createWebhookBodySchema = z.object({
  url: z.string().url(),
  secret: z.string().min(8),
  events: z.array(z.string().min(1)).min(1),
  enabled: z.boolean().optional(),
})

const updateWebhookBodySchema = z.object({
  url: z.string().url().optional(),
  secret: z.string().min(8).optional(),
  events: z.array(z.string().min(1)).min(1).optional(),
  enabled: z.boolean().optional(),
})

export async function listSessionsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  requireProjectIdHeader(request)

  const query = listSessionsQuerySchema.parse(request.query)

  const sessions = await request.server.dbAdapter.getSessionsByUserId(query.userId)

  reply.send({
    data: {
      sessions,
    },
    error: null,
  })
}

export async function deleteSessionHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  requireProjectIdHeader(request)

  const query = deleteSessionQuerySchema.parse(request.query)

  const sessions = await request.server.dbAdapter.getSessionsByUserId(query.userId)
  const target = sessions.find((session) => session.id === request.params.id)

  if (!target) {
    throw new AuthKitError('SESSION_NOT_FOUND', 'Session not found for provided userId', 404)
  }

  await request.server.dbAdapter.revokeSession(target.tokenHash)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function getAuditLogsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const query = auditLogsQuerySchema.parse(request.query)

  const result = await request.server.dbAdapter.getAuditLogs(projectId, {
    userId: query.userId,
    event: query.event,
    limit: query.limit,
    offset: query.offset,
  })

  reply.send({
    data: result,
    error: null,
  })
}

export async function createWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const body = createWebhookBodySchema.parse(request.body)

  const webhook = await request.server.dbAdapter.createWebhookEndpoint({
    projectId,
    url: body.url,
    secret: body.secret,
    events: body.events,
    enabled: body.enabled,
  })

  reply.code(201).send({
    data: {
      webhook,
    },
    error: null,
  })
}

export async function listWebhooksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const webhooks = await request.server.dbAdapter.listWebhookEndpoints(projectId)

  reply.send({
    data: {
      webhooks,
    },
    error: null,
  })
}

export async function updateWebhookHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)
  const body = updateWebhookBodySchema.parse(request.body)

  const webhook = await request.server.dbAdapter.updateWebhookEndpoint(
    projectId,
    request.params.id,
    {
      url: body.url,
      secret: body.secret,
      events: body.events,
      enabled: body.enabled,
    },
  )

  reply.send({
    data: {
      webhook,
    },
    error: null,
  })
}

export async function deleteWebhookHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  await request.server.dbAdapter.deleteWebhookEndpoint(projectId, request.params.id)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
