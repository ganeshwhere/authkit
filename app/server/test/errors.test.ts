import { describe, expect, it } from 'vitest'

import { AuthKitError, Errors } from '../src/utils/errors'

describe('AuthKitError', () => {
  it('creates an error with code and status', () => {
    const error = new AuthKitError('INVALID_TOKEN', 'Invalid token', 401)

    expect(error.name).toBe('AuthKitError')
    expect(error.code).toBe('INVALID_TOKEN')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Invalid token')
  })

  it('returns deterministic factory errors', () => {
    const invalidCredentials = Errors.INVALID_CREDENTIALS()
    const weakPassword = Errors.WEAK_PASSWORD(1)

    expect(invalidCredentials.code).toBe('INVALID_CREDENTIALS')
    expect(invalidCredentials.statusCode).toBe(401)
    expect(weakPassword.code).toBe('WEAK_PASSWORD')
    expect(weakPassword.details).toEqual({ score: 1 })
  })
})
