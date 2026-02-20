import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

export function globalErrorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  reply.status(error.statusCode ?? 500).send({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: {},
    },
  })
}
