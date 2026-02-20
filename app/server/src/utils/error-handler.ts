import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

import { AuthKitError, Errors } from './errors'

export function globalErrorHandler(
  error: FastifyError | AuthKitError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AuthKitError) {
    reply.status(error.statusCode).send({
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? {},
      },
    })
    return
  }

  const internal = Errors.INTERNAL_ERROR()

  reply.status(internal.statusCode).send({
    data: null,
    error: {
      code: internal.code,
      message: internal.message,
      details: {},
    },
  })
}
