import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  exchangeOAuthCode,
  fetchOAuthProfile,
} from '../src/modules/oauth/provider-client'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('oauth provider client', () => {
  it('exchanges authorization code using JSON token response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            access_token: 'token-1',
            refresh_token: 'refresh-1',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    const token = await exchangeOAuthCode(
      {
        id: 'google',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        callbackUrl: 'https://api.authkit.dev/v1/auth/oauth/google/callback',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        defaultScope: 'openid email profile',
      },
      'auth-code',
    )

    expect(token.accessToken).toBe('token-1')
    expect(token.refreshToken).toBe('refresh-1')
    expect(token.expiresIn).toBe(3600)
  })

  it('supports URL-encoded token responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('access_token=token-2&token_type=bearer&expires_in=1800', {
          status: 200,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        }),
      ),
    )

    const token = await exchangeOAuthCode(
      {
        id: 'github',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        callbackUrl: 'https://api.authkit.dev/v1/auth/oauth/github/callback',
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        defaultScope: 'read:user user:email',
      },
      'auth-code',
    )

    expect(token.accessToken).toBe('token-2')
    expect(token.expiresIn).toBe(1800)
  })

  it('maps Google profile payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            sub: 'google-user',
            email: 'USER@example.com',
            email_verified: true,
            name: 'Google User',
            picture: 'https://cdn.example.com/google.png',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    const profile = await fetchOAuthProfile(
      'google',
      'https://openidconnect.googleapis.com/v1/userinfo',
      'token-1',
    )

    expect(profile.providerUserId).toBe('google-user')
    expect(profile.email).toBe('user@example.com')
    expect(profile.emailVerified).toBe(true)
  })

  it('maps GitHub profile and resolves missing email via emails endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 12345,
              login: 'github-user',
              name: 'GitHub User',
              avatar_url: 'https://cdn.example.com/github.png',
              email: null,
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              { email: 'other@example.com', primary: false, verified: true },
              { email: 'primary@example.com', primary: true, verified: true },
            ]),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
    )

    const profile = await fetchOAuthProfile('github', 'https://api.github.com/user', 'token-2')

    expect(profile.providerUserId).toBe('12345')
    expect(profile.email).toBe('primary@example.com')
    expect(profile.emailVerified).toBe(true)
    expect(profile.displayName).toBe('GitHub User')
  })

  it('maps Discord profile payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: 'discord-user',
            username: 'discordname',
            discriminator: '1337',
            email: 'discord@example.com',
            verified: true,
            avatar: 'abcdef123456',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    )

    const profile = await fetchOAuthProfile('discord', 'https://discord.com/api/users/@me', 'token-3')

    expect(profile.providerUserId).toBe('discord-user')
    expect(profile.displayName).toBe('discordname#1337')
    expect(profile.avatarUrl).toContain('/discord-user/abcdef123456.png')
    expect(profile.emailVerified).toBe(true)
  })
})
