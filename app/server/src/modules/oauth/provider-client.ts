import { Errors } from '../../utils/errors'

import type {
  OAuthProviderId,
  OAuthProviderRuntimeConfig,
} from './providers'

export type OAuthTokenExchangeResult = {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType?: string
}

export type OAuthProfile = {
  providerUserId: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  avatarUrl: string | null
  rawProfile: Record<string, unknown>
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readIdentifier(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key]
  return typeof value === 'boolean' ? value : null
}

async function parseTokenResponse(response: Response): Promise<OAuthTokenExchangeResult> {
  const contentType = response.headers.get('content-type') ?? ''
  const bodyText = await response.text()

  let body: Record<string, unknown>

  if (contentType.includes('application/json')) {
    try {
      body = toRecord(JSON.parse(bodyText))
    } catch {
      throw Errors.OAUTH_AUTHORIZATION_FAILED()
    }
  } else {
    const params = new URLSearchParams(bodyText)
    body = Object.fromEntries(params.entries())
  }

  if (!response.ok) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const accessToken = readString(body, 'access_token')

  if (!accessToken) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const refreshToken = readString(body, 'refresh_token') ?? undefined
  const tokenType = readString(body, 'token_type') ?? undefined

  const expiresInRaw = body.expires_in
  const expiresIn =
    typeof expiresInRaw === 'number'
      ? expiresInRaw
      : typeof expiresInRaw === 'string' && expiresInRaw.trim()
        ? Number.parseInt(expiresInRaw, 10)
        : undefined
  const normalizedExpiresIn: number | null =
    typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : null

  const result: OAuthTokenExchangeResult = {
    accessToken,
  }

  if (refreshToken) {
    result.refreshToken = refreshToken
  }

  if (tokenType) {
    result.tokenType = tokenType
  }

  if (normalizedExpiresIn !== null) {
    result.expiresIn = normalizedExpiresIn
  }

  return result
}

export async function exchangeOAuthCode(
  provider: OAuthProviderRuntimeConfig,
  code: string,
): Promise<OAuthTokenExchangeResult> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uri: provider.callbackUrl,
  })

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(5000),
  })

  return parseTokenResponse(response)
}

async function fetchProfileResponse(url: string, accessToken: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'user-agent': 'AuthKit/1.0',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const parsed = await response.json()
  return toRecord(parsed)
}

async function resolveGithubEmail(accessToken: string): Promise<{ email: string | null; verified: boolean }> {
  const response = await fetch('https://api.github.com/user/emails', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'AuthKit/1.0',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return { email: null, verified: false }
  }

  const payload = await response.json()

  if (!Array.isArray(payload)) {
    return { email: null, verified: false }
  }

  const normalized = payload
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      email: typeof item.email === 'string' ? item.email.trim().toLowerCase() : null,
      primary: item.primary === true,
      verified: item.verified === true,
    }))
    .filter((item) => Boolean(item.email))

  const preferred =
    normalized.find((item) => item.primary && item.verified) ??
    normalized.find((item) => item.verified) ??
    normalized.find((item) => item.primary) ??
    normalized[0]

  if (!preferred?.email) {
    return { email: null, verified: false }
  }

  return {
    email: preferred.email,
    verified: preferred.verified,
  }
}

export async function fetchOAuthProfile(
  providerId: OAuthProviderId,
  userInfoUrl: string,
  accessToken: string,
): Promise<OAuthProfile> {
  const rawProfile = await fetchProfileResponse(userInfoUrl, accessToken)

  if (providerId === 'google') {
    const providerUserId = readString(rawProfile, 'sub')
    const email = readString(rawProfile, 'email')

    if (!providerUserId) {
      throw Errors.OAUTH_AUTHORIZATION_FAILED()
    }

    return {
      providerUserId,
      email: email?.toLowerCase() ?? null,
      emailVerified: readBoolean(rawProfile, 'email_verified') ?? false,
      displayName: readString(rawProfile, 'name'),
      avatarUrl: readString(rawProfile, 'picture'),
      rawProfile,
    }
  }

  if (providerId === 'github') {
    const providerUserId = readIdentifier(rawProfile, 'id')

    if (!providerUserId) {
      throw Errors.OAUTH_AUTHORIZATION_FAILED()
    }

    const directEmail = readString(rawProfile, 'email')?.toLowerCase() ?? null
    const resolvedEmail = directEmail
      ? { email: directEmail, verified: false }
      : await resolveGithubEmail(accessToken)

    return {
      providerUserId,
      email: resolvedEmail.email,
      emailVerified: resolvedEmail.verified,
      displayName: readString(rawProfile, 'name') ?? readString(rawProfile, 'login'),
      avatarUrl: readString(rawProfile, 'avatar_url'),
      rawProfile,
    }
  }

  const providerUserId = readIdentifier(rawProfile, 'id')

  if (!providerUserId) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const username = readString(rawProfile, 'username')
  const discriminator = readString(rawProfile, 'discriminator')
  const avatar = readString(rawProfile, 'avatar')
  const avatarUrl = avatar
    ? `https://cdn.discordapp.com/avatars/${providerUserId}/${avatar}.png`
    : null

  return {
    providerUserId,
    email: readString(rawProfile, 'email')?.toLowerCase() ?? null,
    emailVerified: readBoolean(rawProfile, 'verified') ?? false,
    displayName: discriminator && discriminator !== '0' ? `${username}#${discriminator}` : username,
    avatarUrl,
    rawProfile,
  }
}
