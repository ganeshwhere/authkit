import { createPublicKey } from 'node:crypto'

import type { FastifyRequest } from 'fastify'

import { config } from '../../config'
import type { AccessTokenPayload } from '../../types/auth'
import { verifyAccessToken } from '../../utils/crypto'
import { Errors } from '../../utils/errors'

export async function requireAccessToken(request: FastifyRequest): Promise<AccessTokenPayload> {
  const header = request.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    throw Errors.UNAUTHORIZED()
  }

  const token = header.slice('Bearer '.length).trim()

  try {
    return await verifyAccessToken(token, createPublicKey(config.jwtPublicKey))
  } catch {
    throw Errors.UNAUTHORIZED()
  }
}
