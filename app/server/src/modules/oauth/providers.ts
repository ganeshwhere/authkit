import { config } from '../../config'
import { Errors } from '../../utils/errors'

export const oauthProviderIds = ['google', 'github', 'discord'] as const

export type OAuthProviderId = (typeof oauthProviderIds)[number]

type OAuthProviderDefinition = {
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  defaultScope: string
  extraAuthorizeParams?: Record<string, string>
}

export type OAuthProviderRuntimeConfig = {
  id: OAuthProviderId
  clientId: string
  clientSecret: string
  callbackUrl: string
} & OAuthProviderDefinition

const providerDefinitions: Record<OAuthProviderId, OAuthProviderDefinition> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    defaultScope: 'openid email profile',
    extraAuthorizeParams: {
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    },
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    defaultScope: 'read:user user:email',
  },
  discord: {
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    defaultScope: 'identify email',
  },
}

function isSupportedProvider(provider: string): provider is OAuthProviderId {
  return (oauthProviderIds as readonly string[]).includes(provider)
}

export function getOAuthProviderConfig(providerInput: string): OAuthProviderRuntimeConfig {
  if (!isSupportedProvider(providerInput)) {
    throw Errors.OAUTH_PROVIDER_NOT_CONFIGURED(providerInput)
  }

  const credentials = config.oauthProviders[providerInput]

  if (!credentials) {
    throw Errors.OAUTH_PROVIDER_NOT_CONFIGURED(providerInput)
  }

  const callbackUrl = new URL(`/v1/auth/oauth/${providerInput}/callback`, config.baseUrl).toString()

  return {
    id: providerInput,
    ...providerDefinitions[providerInput],
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    callbackUrl,
  }
}

export function buildAuthorizationUrl(
  provider: OAuthProviderRuntimeConfig,
  state: string,
): string {
  const authorizationUrl = new URL(provider.authorizeUrl)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('client_id', provider.clientId)
  authorizationUrl.searchParams.set('redirect_uri', provider.callbackUrl)
  authorizationUrl.searchParams.set('scope', provider.defaultScope)
  authorizationUrl.searchParams.set('state', state)

  if (provider.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(provider.extraAuthorizeParams)) {
      authorizationUrl.searchParams.set(key, value)
    }
  }

  return authorizationUrl.toString()
}
