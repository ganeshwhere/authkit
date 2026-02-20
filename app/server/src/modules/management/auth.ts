import type { FastifyRequest } from 'fastify'

import { config } from '../../config'
import { Errors } from '../../utils/errors'

export function requireManagementSecret(request: FastifyRequest): void {
  const secret = request.headers['x-authkit-secret-key']

  if (typeof secret !== 'string' || secret !== config.hmacSecret) {
    throw Errors.FORBIDDEN()
  }
}

export function requireProjectIdHeader(request: FastifyRequest): string {
  const projectId = request.headers['x-authkit-project-id']

  if (typeof projectId !== 'string' || !projectId.trim()) {
    throw Errors.PROJECT_ID_REQUIRED()
  }

  return projectId
}
