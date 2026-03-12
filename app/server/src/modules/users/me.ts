import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { requireAccessToken } from '../auth/access'
import { AuthKitError, Errors } from '../../utils/errors'

const updateMeBodySchema = z.object({
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const deleteMeBodySchema = z.object({
  confirmation: z.string(),
})

function validateMetadata(metadata: Record<string, unknown>): void {
  const keys = Object.keys(metadata)

  if (keys.length > 10) {
    throw new AuthKitError('INVALID_METADATA', 'Metadata exceeds maximum key count', 400)
  }

  const validateValue = (value: unknown, depth: number): void => {
    if (depth > 2) {
      throw new AuthKitError('INVALID_METADATA', 'Metadata exceeds maximum nesting depth', 400)
    }

    if (typeof value === 'string' && value.length > 500) {
      throw new AuthKitError('INVALID_METADATA', 'Metadata string value too long', 400)
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        validateValue(item, depth + 1)
      }
      return
    }

    if (value && typeof value === 'object') {
      for (const nestedValue of Object.values(value as Record<string, unknown>)) {
        validateValue(nestedValue, depth + 1)
      }
    }
  }

  for (const value of Object.values(metadata)) {
    validateValue(value, 1)
  }
}

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = await requireAccessToken(request)

  const user = await request.server.dbAdapter.getUserById(auth.pid, auth.sub)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  const [linkedAccounts, mfa, passkeys, sessions] = await Promise.all([
    request.server.dbAdapter.getOAuthAccountsByUserId(user.id),
    request.server.dbAdapter.getMFA(user.id),
    request.server.dbAdapter.getPasskeysByUserId(user.id),
    request.server.dbAdapter.getSessionsByUserId(user.id),
  ])

  reply.send({
    data: {
      user,
      linkedAccounts,
      mfaEnabled: Boolean(mfa),
      passkeys,
      sessions,
    },
    error: null,
  })
}

export async function patchMeHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = await requireAccessToken(request)
  const parsed = updateMeBodySchema.parse(request.body)

  if (parsed.metadata) {
    validateMetadata(parsed.metadata)
  }

  const user = await request.server.dbAdapter.updateUser(auth.pid, auth.sub, {
    ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
    ...(parsed.avatarUrl ? { avatarUrl: parsed.avatarUrl } : {}),
    ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
  })

  reply.send({
    data: {
      user,
    },
    error: null,
  })
}

export async function deleteMeHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = await requireAccessToken(request)
  const parsed = deleteMeBodySchema.parse(request.body)

  if (parsed.confirmation !== 'DELETE') {
    throw new AuthKitError('INVALID_CONFIRMATION', 'Invalid account deletion confirmation', 400)
  }

  await request.server.dbAdapter.deleteUser(auth.pid, auth.sub)
  await request.server.dbAdapter.revokeAllUserSessions(auth.sub)

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}
