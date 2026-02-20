import { describe, expect, it, vi } from 'vitest'

import { getAuth, withAuth } from './server'

describe('nextjs server helpers', () => {
  it('returns null when bearer token is missing', async () => {
    const result = await getAuth({
      projectId: 'project_1',
      baseUrl: 'https://api.example.com',
      fetch: vi.fn() as never,
    })

    expect(result).toBeNull()
  })

  it('returns auth context for valid /v1/user/me response', async () => {
    const fetcher = vi.fn(async () =>
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
              bannedAt: null,
              deletedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            sessions: [
              {
                id: 'session_1',
                userId: 'user_1',
                projectId: 'project_1',
                tokenHash: 'hash',
                tokenFamily: 'family',
                ipAddress: null,
                userAgent: null,
                lastActiveAt: new Date().toISOString(),
                expiresAt: new Date().toISOString(),
                revokedAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const result = await getAuth({
      projectId: 'project_1',
      baseUrl: 'https://api.example.com',
      headers: {
        authorization: 'Bearer token_1',
      },
      fetch: fetcher as never,
    })

    expect(result?.token).toBe('token_1')
    expect(result?.user.email).toBe('user@example.com')
  })

  it('wraps handlers and invokes unauthorized fallback', async () => {
    const handler = withAuth(
      async (_request: { token?: string }, auth) => auth.user.id,
      {
        getAuth: async () => null,
        onUnauthorized: async () => 'unauthorized',
      },
    )

    const result = await handler({})

    expect(result).toBe('unauthorized')
  })
})
