import { AuthKitError } from '@authkit/core'
import { describe, expect, it } from 'vitest'

import { normalizeAuthKitError } from './utils'

describe('normalizeAuthKitError', () => {
  it('returns same instance for AuthKitError', () => {
    const error = new AuthKitError({
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    })

    expect(normalizeAuthKitError(error)).toBe(error)
  })

  it('normalizes unknown errors to AuthKitError', () => {
    const normalized = normalizeAuthKitError(new Error('Boom'))

    expect(normalized).toBeInstanceOf(AuthKitError)
    expect(normalized.code).toBe('UNKNOWN_ERROR')
    expect(normalized.message).toBe('Boom')
  })
})
