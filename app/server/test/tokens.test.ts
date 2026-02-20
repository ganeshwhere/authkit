import { describe, expect, it, vi } from 'vitest'

import {
  clearRefreshTokenCookie,
  createAccessTokenPayload,
  createTokenFamilyId,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../src/utils/tokens'

describe('token utilities', () => {
  it('creates access token payload with expected claims', () => {
    const payload = createAccessTokenPayload(
      {
        userId: 'user-1',
        sessionId: 'session-1',
        projectId: 'project-1',
        email: 'user@example.com',
        emailVerified: true,
        issuer: 'https://api.authkit.dev',
      },
      900,
      1700000000,
    )

    expect(payload.sub).toBe('user-1')
    expect(payload.sid).toBe('session-1')
    expect(payload.exp).toBe(1700000900)
  })

  it('issues refresh token and hash', () => {
    const issued = issueRefreshToken(32)

    expect(issued.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(issued.tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('creates token family identifier', () => {
    const familyId = createTokenFamilyId()

    expect(familyId).toMatch(/^[a-f0-9-]+$/)
  })

  it('sets and clears refresh token cookie with secure options', () => {
    const reply = {
      setCookie: vi.fn(),
      clearCookie: vi.fn(),
    }

    setRefreshTokenCookie(reply as never, 'refresh-token')
    clearRefreshTokenCookie(reply as never)

    expect(reply.setCookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/v1/auth/refresh',
    })
    expect(reply.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/v1/auth/refresh',
    })
  })
})
