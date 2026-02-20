import { describe, expect, it, vi } from 'vitest'

import { AuthKitClient } from './client'
import { AuthKitError } from './errors'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

describe('AuthKitClient', () => {
  it('signs up user and stores auth state', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        data: {
          user: {
            id: 'user_1',
            projectId: 'project_1',
            email: 'user@example.com',
            emailVerified: false,
            displayName: 'User',
            avatarUrl: null,
            metadata: {},
            bannedAt: null,
            deletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: 'token_1',
          session: {
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
        },
        error: null,
      }),
    )

    const client = new AuthKitClient({
      projectId: 'project_1',
      baseUrl: 'https://api.example.com',
      fetch: fetcher as never,
    })

    const result = await client.signUp('user@example.com', 'Password#123', {
      displayName: 'User',
    })

    expect(result.user.email).toBe('user@example.com')
    expect(client.getAuthState().isSignedIn).toBe(true)

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/v1/auth/signup')
    expect((init.headers as Record<string, string>)['x-authkit-project-id']).toBe('project_1')
  })

  it('returns mfa challenge without mutating signed-in state', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        data: {
          mfaRequired: true,
          mfaToken: 'mfa-token',
        },
        error: null,
      }),
    )

    const client = new AuthKitClient({
      projectId: 'project_1',
      fetch: fetcher as never,
    })

    const result = await client.signIn('user@example.com', 'Password#123')

    expect('mfaRequired' in result && result.mfaRequired).toBe(true)
    expect(client.getAuthState().isSignedIn).toBe(false)
  })

  it('throws typed errors for API envelope failures', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(
        {
          data: null,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            details: {},
          },
        },
        401,
      ),
    )

    const client = new AuthKitClient({
      projectId: 'project_1',
      fetch: fetcher as never,
    })

    await expect(client.signIn('user@example.com', 'wrong')).rejects.toBeInstanceOf(AuthKitError)
    await expect(client.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('requires access token for protected methods', async () => {
    const client = new AuthKitClient({
      projectId: 'project_1',
      fetch: vi.fn() as never,
    })

    await expect(client.getUserProfile()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('emits auth state updates and refreshes token when missing', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
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
            accessToken: 'token_1',
            session: {
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
          },
          error: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            success: true,
          },
          error: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            accessToken: 'token_2',
            session: {
              id: 'session_2',
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
          },
          error: null,
        }),
      )

    const client = new AuthKitClient({
      projectId: 'project_1',
      fetch: fetcher as never,
    })

    const signedInStates: boolean[] = []
    const unsubscribe = client.onAuthStateChange((state) => {
      signedInStates.push(state.isSignedIn)
    })

    await client.signIn('user@example.com', 'Password#123')
    await client.signOut()
    const token = await client.getAccessToken()

    unsubscribe()

    expect(token).toBe('token_2')
    expect(signedInStates[0]).toBe(false)
    expect(signedInStates.some((value) => value)).toBe(true)
  })
})
