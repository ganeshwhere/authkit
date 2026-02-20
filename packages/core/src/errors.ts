import type { APIErrorShape } from './types'

export class AuthKitError extends Error {
  readonly code: string
  readonly details: Record<string, unknown>
  readonly status: number

  constructor(params: {
    code: string
    message: string
    details?: Record<string, unknown>
    status?: number
  }) {
    super(params.message)
    this.name = 'AuthKitError'
    this.code = params.code
    this.details = params.details ?? {}
    this.status = params.status ?? 400
  }
}

export function toAuthKitError(
  payload: APIErrorShape,
  status: number,
): AuthKitError {
  return new AuthKitError({
    code: payload.code,
    message: payload.message,
    details: payload.details,
    status,
  })
}
