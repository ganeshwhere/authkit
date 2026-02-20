import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../../config'
import { requireProjectIdHeader } from '../management/auth'
import {
  buildAuthorizationUrl,
  getOAuthProviderConfig,
} from './providers'
import {
  consumeOAuthState,
  createOAuthState,
  resolveOAuthRedirectUrl,
} from './state'
import { Errors } from '../../utils/errors'

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

export async function oauthBeginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = requireProjectIdHeader(request)
  const { provider } = oauthParamsSchema.parse(request.params)
  const query = oauthBeginQuerySchema.parse(request.query)

  const providerConfig = getOAuthProviderConfig(provider)
  const redirectUrl = resolveOAuthRedirectUrl(
    query.redirectUrl,
    config.oauthRedirectAllowlist,
  )

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

  const location = appendQuery(state.redirectUrl, {
    provider: providerConfig.id,
    oauth_code: query.code,
    state: state.clientState ?? undefined,
  })

  reply.redirect(location)
}
