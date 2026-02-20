import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { AuthKitError, Errors } from './errors'

export function globalErrorHandler(
  error: FastifyError | AuthKitError | ZodError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    const validationError = Errors.VALIDATION_ERROR({
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })

    reply.status(validationError.statusCode).send({
      data: null,
      error: {
        code: validationError.code,
        message: validationError.message,
        details: validationError.details ?? {},
      },
    })
    return
  }

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
