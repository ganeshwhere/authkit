import type {
  AuthKitClient,
  AuthState,
  UserProfileResult,
} from '@authkit/core'
import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'

import { createAuthKitStore } from './store'

const UNAUTHENTICATED_STATE: AuthState = {
  user: null,
  session: null,
  accessToken: null,
  isSignedIn: false,
}

function createMockClient(params: {
  getAccessToken: () => Promise<string | null>
  getUserProfile: () => Promise<UserProfileResult>
}) {
  let currentState = UNAUTHENTICATED_STATE
  let listener: ((state: AuthState) => void) | null = null

  const getAccessToken = vi.fn(params.getAccessToken)
  const getUserProfile = vi.fn(params.getUserProfile)

  const client = {
    getAuthState: vi.fn(() => currentState),
    onAuthStateChange: vi.fn((callback: (state: AuthState) => void) => {
      listener = callback
      callback(currentState)
      return () => {
        listener = null
      }
    }),
    getAccessToken,
    getUserProfile,
    signOut: vi.fn(async () => {}),
  } as unknown as AuthKitClient

  return {
    client,
    spies: {
      getAccessToken,
      getUserProfile,
    },
    emit(state: AuthState) {
      currentState = state
      listener?.(state)
    },
  }
}

describe('createAuthKitStore', () => {
  it('initializes state and fetches profile when token exists', async () => {
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
          ipAddress: null,
          userAgent: null,
          lastActiveAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          revokedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
    }

    const mock = createMockClient({
      getAccessToken: async () => 'token',
      getUserProfile: async () => profile,
    })

    const store = createAuthKitStore({ client: mock.client })
    await store.initialize()

    expect(get(store.isLoaded)).toBe(true)
    expect(mock.spies.getAccessToken).toHaveBeenCalledTimes(1)
    expect(mock.spies.getUserProfile).toHaveBeenCalledTimes(1)
    const firstSession = profile.sessions[0] ?? null

    mock.emit({
      user: profile.user,
      session: firstSession,
      accessToken: 'token',
      isSignedIn: true,
    })

    expect(get(store.user)?.id).toBe('user_1')
    expect(get(store.isSignedIn)).toBe(true)
  })

  it('skips profile fetch when token is missing', async () => {
    const mock = createMockClient({
      getAccessToken: async () => null,
      getUserProfile: async () => {
        throw new Error('Should not be called')
      },
    })

    const store = createAuthKitStore({ client: mock.client })
    await store.initialize()

    expect(get(store.isLoaded)).toBe(true)
    expect(mock.spies.getUserProfile).not.toHaveBeenCalled()
  })
})
