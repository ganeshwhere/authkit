import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { requireProjectIdHeader, requireManagementSecret } from './auth'

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
})

const createUserBodySchema = z.object({
  email: z.string().email().max(255),
  emailVerified: z.boolean().optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const updateUserBodySchema = z.object({
  email: z.string().email().max(255).optional(),
  emailVerified: z.boolean().optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function listUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)
  const query = listUsersQuerySchema.parse(request.query)

  const result = await request.server.dbAdapter.listUsers(projectId, {
    limit: query.limit,
    offset: query.offset,
    ...(query.search ? { search: query.search } : {}),
  })

  reply.send({
    data: result,
    error: null,
  })
}

export async function createUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)
  const body = createUserBodySchema.parse(request.body)

  const user = await request.server.dbAdapter.createUser(projectId, {
    email: body.email.trim().toLowerCase(),
    ...(body.emailVerified !== undefined ? { emailVerified: body.emailVerified } : {}),
    ...(body.displayName ? { displayName: body.displayName } : {}),
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.metadata ? { metadata: body.metadata } : {}),
  })

  reply.code(201).send({
    data: {
      user,
    },
    error: null,
  })
}

export async function getUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const user = await request.server.dbAdapter.getUserById(projectId, request.params.id)

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}

export async function updateUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)
  const body = updateUserBodySchema.parse(request.body)

  const user = await request.server.dbAdapter.updateUser(projectId, request.params.id, {
    ...(body.email?.trim().toLowerCase() ? { email: body.email.trim().toLowerCase() } : {}),
    ...(body.emailVerified !== undefined ? { emailVerified: body.emailVerified } : {}),
    ...(body.displayName ? { displayName: body.displayName } : {}),
    ...(body.avatarUrl ? { avatarUrl: body.avatarUrl } : {}),
    ...(body.metadata ? { metadata: body.metadata } : {}),
  })

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}

export async function deleteUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  await request.server.dbAdapter.deleteUser(projectId, request.params.id)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function banUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const user = await request.server.dbAdapter.updateUser(projectId, request.params.id, {
    bannedAt: new Date(),
  })

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}

export async function unbanUserHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)
  const projectId = requireProjectIdHeader(request)

  const user = await request.server.dbAdapter.updateUser(projectId, request.params.id, {
    bannedAt: null,
  })

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}

export async function revokeUserSessionsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  requireManagementSecret(request)

  await request.server.dbAdapter.revokeAllUserSessions(request.params.id)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
