import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'
import { requireProjectIdHeader } from '../management/auth'
import { exchangeOAuthCode, fetchOAuthProfile } from './provider-client'
import { buildAuthorizationUrl, getOAuthProviderConfig } from './providers'
import {
  consumeOAuthState,
  createOAuthState,
  resolveOAuthRedirectUrl,
} from './state'

const oauthParamsSchema = z.object({
  provider: z.string().min(1),
})

const oauthBeginQuerySchema = z.object({
  redirectUrl: z.string().url().optional(),
  state: z.string().min(1).max(500).optional(),
})

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1),
  error: z.string().min(1).optional(),
})

function appendQuery(url: string, params: Record<string, string | undefined>): string {
  const target = new URL(url)

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      target.searchParams.set(key, value)
    }
  }

  return target.toString()
}

function appendHash(url: string, params: Record<string, string | undefined>): string {
  const target = new URL(url)
  const hash = target.hash.startsWith('#') ? target.hash.slice(1) : target.hash
  const hashParams = new URLSearchParams(hash)

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      hashParams.set(key, value)
    }
  }

  target.hash = hashParams.toString()

  return target.toString()
}

async function resolveOAuthUser(
  request: FastifyRequest,
  data: {
    projectId: string
    provider: string
    providerUserId: string
    email: string | null
    emailVerified: boolean
    displayName: string | null
    avatarUrl: string | null
    rawProfile: Record<string, unknown>
  },
) {
  const existingAccount = await request.server.dbAdapter.getOAuthAccount(
    data.projectId,
    data.provider,
    data.providerUserId,
  )

  if (existingAccount) {
    const existingUser = await request.server.dbAdapter.getUserById(data.projectId, existingAccount.userId)

    if (!existingUser || existingUser.deletedAt) {
      throw Errors.UNAUTHORIZED()
    }

    return existingUser
  }

  if (!data.email) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  let user = await request.server.dbAdapter.getUserByEmail(data.projectId, normalizedEmail)

  if (!user) {
    user = await request.server.dbAdapter.createUser(data.projectId, {
      email: normalizedEmail,
      emailVerified: data.emailVerified,
      displayName: data.displayName ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      metadata: {},
    })
  }

  try {
    await request.server.dbAdapter.createOAuthAccount({
      userId: user.id,
      projectId: data.projectId,
      provider: data.provider,
      providerUserId: data.providerUserId,
      rawProfile: data.rawProfile,
    })
  } catch {
    const account = await request.server.dbAdapter.getOAuthAccount(
      data.projectId,
      data.provider,
      data.providerUserId,
    )

    if (!account || account.userId !== user.id) {
      throw Errors.OAUTH_AUTHORIZATION_FAILED()
    }
  }

  return user
}

export async function oauthBeginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = requireProjectIdHeader(request)
  const { provider } = oauthParamsSchema.parse(request.params)
  const query = oauthBeginQuerySchema.parse(request.query)

  const providerConfig = getOAuthProviderConfig(provider)
  const redirectUrl = resolveOAuthRedirectUrl(query.redirectUrl, config.oauthRedirectAllowlist)

  const state = await createOAuthState(request.server.cache, {
    projectId,
    provider: providerConfig.id,
    redirectUrl,
    clientState: query.state ?? null,
  })

  const authorizationUrl = buildAuthorizationUrl(providerConfig, state)

  reply.redirect(authorizationUrl)
}

export async function oauthCallbackHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { provider } = oauthParamsSchema.parse(request.params)
  const query = oauthCallbackQuerySchema.parse(request.query)

  const providerConfig = getOAuthProviderConfig(provider)
  const state = await consumeOAuthState(request.server.cache, query.state)

  if (state.provider !== providerConfig.id) {
    throw Errors.INVALID_OAUTH_STATE()
  }

  if (query.error) {
    const location = appendQuery(state.redirectUrl, {
      provider: providerConfig.id,
      error: query.error,
      state: state.clientState ?? undefined,
    })

    reply.redirect(location)
    return
  }

  if (!query.code) {
    throw Errors.OAUTH_AUTHORIZATION_FAILED()
  }

  const tokenSet = await exchangeOAuthCode(providerConfig, query.code)
  const profile = await fetchOAuthProfile(providerConfig.id, providerConfig.userInfoUrl, tokenSet.accessToken)

  const user = await resolveOAuthUser(request, {
    projectId: state.projectId,
    provider: providerConfig.id,
    providerUserId: profile.providerUserId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    rawProfile: profile.rawProfile,
  })

  if (user.bannedAt) {
    throw Errors.ACCOUNT_BANNED()
  }

  const refresh = issueRefreshToken(32)
  const tokenFamily = createTokenFamilyId()
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000)

  const session = await request.server.dbAdapter.createSession({
    userId: user.id,
    projectId: state.projectId,
    tokenHash: refresh.tokenHash,
    tokenFamily,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
    expiresAt,
  })

  const accessToken = await issueAccessToken({
    context: {
      userId: user.id,
      sessionId: session.id,
      projectId: state.projectId,
      email: user.email,
      emailVerified: user.emailVerified,
      issuer: config.baseUrl,
    },
    ttlSeconds: config.accessTokenTtlSeconds,
    privateKey: createPrivateKey(config.jwtPrivateKey),
  })

  setRefreshTokenCookie(reply, refresh.token, config.nodeEnv === 'production')

  const location = appendHash(
    appendQuery(state.redirectUrl, {
      provider: providerConfig.id,
      state: state.clientState ?? undefined,
    }),
    { accessToken },
  )

  reply.redirect(location)
}
