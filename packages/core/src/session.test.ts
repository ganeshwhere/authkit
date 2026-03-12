import { describe, expect, it } from 'vitest'

import { AuthStateStore } from './session'
import type { AuthState } from './types'

describe('AuthStateStore', () => {
  it('tracks auth state and notifies listeners', () => {
    const store = new AuthStateStore()
    const observed: Array<{ isSignedIn: boolean; token: string | null }> = []

    const unsubscribe = store.subscribe((state: AuthState) => {
      observed.push({ isSignedIn: state.isSignedIn, token: state.accessToken })
    })

    store.setAuthenticated({
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
    })

    store.clear()
    unsubscribe()

    expect(observed[0]).toEqual({ isSignedIn: false, token: null })
    expect(observed.some((entry) => entry.isSignedIn && entry.token === 'token_1')).toBe(true)
    expect(observed[observed.length - 1]).toEqual({ isSignedIn: false, token: null })
  })
})
