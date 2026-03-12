import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify'
import fp from 'fastify-plugin'

export type AuthKitFastifyConfig = {
  projectId: string
  baseUrl: string
  fetch?: typeof fetch
}

export type AuthenticatedUser = {
  id: string
  projectId: string
  email: string
  emailVerified: boolean
  displayName: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown>
}

export type AuthenticatedSession = {
  id: string
  userId: string
  projectId: string
  ipAddress: string | null
  userAgent: string | null
  lastActiveAt: string
  expiresAt: string
}

export type AuthContext = {
  token: string
  user: AuthenticatedUser
  session: AuthenticatedSession | null
}

type Envelope<T> = {
  data: T | null
  error: {
    code: string
    message: string
    details: Record<string, unknown>
  } | null
}

type UserMeResponse = {
  user: AuthenticatedUser
  sessions: AuthenticatedSession[]
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function readBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

async function resolveAuthContext(
  config: AuthKitFastifyConfig,
  token: string,
): Promise<AuthContext | null> {
  const fetcher = config.fetch ?? globalThis.fetch

  if (!fetcher) {
    throw new Error('No fetch implementation available for @authkit/fastify')
  }

  const response = await fetcher(`${normalizeBaseUrl(config.baseUrl)}/v1/user/me`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'x-authkit-project-id': config.projectId,
    },
  })

  if (!response.ok) {
    return null
  }

  const parsed = (await response.json()) as Envelope<UserMeResponse>

  if (!parsed || parsed.error || !parsed.data) {
    return null
  }

  return {
    token,
    user: parsed.data.user,
    session: parsed.data.sessions[0] ?? null,
  }
}

const authKitPlugin: FastifyPluginAsync<AuthKitFastifyConfig> = async (server, options) => {
  server.decorateRequest('auth', null)

  server.addHook('preHandler', async (request) => {
    const token = readBearerToken(request)

    if (!token) {
      request.auth = null
      return
    }

    request.auth = (await resolveAuthContext(options, token)) ?? null
  })
}

export const authKit = fp(authKitPlugin, {
  name: 'authkit-fastify',
})

export function requireAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (request.auth?.user) {
      return
    }

    reply.code(401).send({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: {},
      },
    })
  }
}
