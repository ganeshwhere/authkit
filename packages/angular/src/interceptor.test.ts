import { describe, expect, it, vi } from 'vitest'

import { withBearerToken } from './interceptor'

describe('withBearerToken', () => {
  it('returns original request when token is missing', () => {
    const request = {
      clone: vi.fn(),
    }

    const result = withBearerToken(request as never, null)

    expect(result).toBe(request)
    expect(request.clone).not.toHaveBeenCalled()
  })

  it('clones request with bearer token header', () => {
    const cloned = { id: 'cloned' }
    const request = {
      clone: vi.fn(() => cloned),
    }

    const result = withBearerToken(request as never, 'token_123')

    expect(result).toBe(cloned)
    expect(request.clone).toHaveBeenCalledWith({
      setHeaders: {
        authorization: 'Bearer token_123',
      },
    })
  })
})
