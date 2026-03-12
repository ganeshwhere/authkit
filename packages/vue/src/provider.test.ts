import type {
  AuthKitClient,
  AuthState,
  UserProfileResult,
} from '@authkit/core'
import { describe, expect, it, vi } from 'vitest'

import { createAuthKit } from './provider'

const AUTH_STATE_UNAUTHENTICATED: AuthState = {
  user: null,
  session: null,
  accessToken: null,
  isSignedIn: false,
}

function createMockClient(params: {
  getAccessToken: () => Promise<string | null>
  getUserProfile: () => Promise<UserProfileResult>
}) {
  let state = AUTH_STATE_UNAUTHENTICATED
  let listener: ((next: AuthState) => void) | null = null

  const getAuthState = vi.fn(() => state)
  const onAuthStateChange = vi.fn((callback: (next: AuthState) => void) => {
    listener = callback
    callback(state)
    return () => {
      listener = null
    }
  })
  const getAccessToken = vi.fn(params.getAccessToken)
  const getUserProfile = vi.fn(params.getUserProfile)

  const client = {
    getAuthState,
    onAuthStateChange,
    getAccessToken,
    getUserProfile,
  } as unknown as AuthKitClient

  return {
    client,
    spies: {
      getAuthState,
      onAuthStateChange,
      getAccessToken,
      getUserProfile,
    },
    emit(next: AuthState) {
      state = next
      listener?.(next)
    },
  }
}

describe('createAuthKit', () => {
  it('initializes auth state and loads profile when token is available', async () => {
    const profile: UserProfileResult = {
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
      linkedAccounts: [],
      mfaEnabled: false,
      passkeys: [],
      sessions: [
        {
          id: 'session_1',
          userId: 'user_1',
          projectId: 'project_1',
          tokenHash: 'hash',
          tokenFamily: 'family',
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
          lastActiveAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          revokedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const mock = createMockClient({
      getAccessToken: async () => 'access-token',
      getUserProfile: async () => profile,
    })

    const context = createAuthKit({
      client: mock.client,
    })

    await context.initialize()

    expect(context.isLoaded.value).toBe(true)
    expect(mock.spies.getAccessToken).toHaveBeenCalledTimes(1)
    expect(mock.spies.getUserProfile).toHaveBeenCalledTimes(1)
    const firstSession = profile.sessions[0] ?? null

    mock.emit({
      user: profile.user,
      session: firstSession,
      accessToken: 'access-token',
      isSignedIn: true,
    })

    expect(context.state.value.user?.id).toBe('user_1')
    expect(context.state.value.isSignedIn).toBe(true)

    context.dispose()

    mock.emit({
      ...AUTH_STATE_UNAUTHENTICATED,
      accessToken: 'stale-token',
      isSignedIn: false,
    })

    expect(context.state.value.user?.id).toBe('user_1')
  })

  it('skips profile loading when no access token is present', async () => {
    const mock = createMockClient({
      getAccessToken: async () => null,
      getUserProfile: async () => {
        throw new Error('Should not be called')
      },
    })

    const context = createAuthKit({
      client: mock.client,
    })

    await context.initialize()

    expect(context.isLoaded.value).toBe(true)
    expect(mock.spies.getUserProfile).not.toHaveBeenCalled()
  })

  it('requires either config or client', () => {
    expect(() => {
      createAuthKit({})
    }).toThrow('AuthKit requires either a client instance or config to initialize')
  })
})
