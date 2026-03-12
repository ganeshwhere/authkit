import { describe, expect, it, vi } from 'vitest'

import { authKit, optionalAuth, requireAuth } from './index'

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }

  response.status.mockReturnValue(response)

  return response
}

describe('@authkit/express', () => {
  it('sets req.auth when bearer token resolves to user context', async () => {
    const middleware = authKit({
      projectId: 'project_1',
      baseUrl: 'https://api.example.com',
      fetch: vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              user: {
                id: 'user_1',
                projectId: 'project_1',
                email: 'user@example.com',
                emailVerified: true,
                displayName: 'User',
                avatarUrl: null,
                metadata: {},
              },
              sessions: [],
            },
            error: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ) as never,
    })

    const request = {
      headers: {
        authorization: 'Bearer token_1',
      },
    } as {
      headers: {
        authorization: string
      }
      auth?: {
        token: string
        user: {
          email: string
        }
      }
    }

    await middleware(request as never, {} as never, vi.fn())

    expect(request.auth?.token).toBe('token_1')
    expect(request.auth?.user.email).toBe('user@example.com')
  })

  it('returns 401 from requireAuth when auth context is missing', () => {
    const middleware = requireAuth()
    const response = createResponseMock()

    middleware({} as never, response as never, vi.fn())

    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: {},
      },
    })
  })

  it('passes through optionalAuth middleware', () => {
    const middleware = optionalAuth()
    const next = vi.fn()

    middleware({} as never, {} as never, next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})
