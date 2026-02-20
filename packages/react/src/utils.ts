import { AuthKitError } from '@authkit/core'

export function normalizeAuthKitError(error: unknown): AuthKitError {
  if (error instanceof AuthKitError) {
    return error
  }

  if (error instanceof Error) {
    return new AuthKitError({
      code: 'UNKNOWN_ERROR',
      message: error.message,
    })
  }

  return new AuthKitError({
    code: 'UNKNOWN_ERROR',
    message: 'Unknown error occurred',
  })
}
