import type {
  APIResponseEnvelope,
  Session,
  User,
} from '@authkit/core'

export type ServerAuthOptions = {
  projectId: string
  baseUrl: string
  headers?: Headers | Record<string, string | string[] | undefined>
  fetch?: typeof fetch
}

export type ServerAuthResult = {
  token: string
  user: User
  session: Session | null
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function readAuthorizationHeader(
  headers?: Headers | Record<string, string | string[] | undefined>,
): string | null {
  if (!headers) {
    return null
  }

  if (headers instanceof Headers) {
    return headers.get('authorization')
  }

  const value = headers.authorization ?? headers.Authorization

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return typeof value === 'string' ? value : null
}

function readBearerToken(headers?: Headers | Record<string, string | string[] | undefined>): string | null {
  const authorization = readAuthorizationHeader(headers)

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice('Bearer '.length).trim()
}

function parseEnvelope<T>(value: unknown): APIResponseEnvelope<T> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const envelope = value as APIResponseEnvelope<T>

  if (!('data' in envelope) || !('error' in envelope)) {
    return null
  }

  return envelope
}

export async function getAuth(options: ServerAuthOptions): Promise<ServerAuthResult | null> {
  const fetcher = options.fetch ?? globalThis.fetch

  if (!fetcher) {
    return null
  }

  const token = readBearerToken(options.headers)

  if (!token) {
    return null
  }

  const response = await fetcher(`${normalizeBaseUrl(options.baseUrl)}/v1/user/me`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'x-authkit-project-id': options.projectId,
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = await response.json()
  const envelope = parseEnvelope<{ user: User; sessions: Session[] }>(payload)

  if (!envelope || envelope.error || !envelope.data) {
    return null
  }

  return {
    token,
    user: envelope.data.user,
    session: envelope.data.sessions[0] ?? null,
  }
}

export async function currentUser(options: ServerAuthOptions): Promise<User | null> {
  const auth = await getAuth(options)
  return auth?.user ?? null
}

export async function currentSession(options: ServerAuthOptions): Promise<Session | null> {
  const auth = await getAuth(options)
  return auth?.session ?? null
}

export function withAuth<TRequest, TResult>(
  handler: (request: TRequest, auth: ServerAuthResult) => Promise<TResult> | TResult,
  options: {
    getAuth: (request: TRequest) => Promise<ServerAuthResult | null>
    onUnauthorized?: (request: TRequest) => Promise<TResult> | TResult
  },
): (request: TRequest) => Promise<TResult> {
  return async (request: TRequest): Promise<TResult> => {
    const auth = await options.getAuth(request)

    if (!auth) {
      if (options.onUnauthorized) {
        return options.onUnauthorized(request)
      }

      throw new Error('Unauthorized')
    }

    return handler(request, auth)
  }
}

export function withServerSideAuth<TContext, TResult>(
  handler: (context: TContext, auth: ServerAuthResult) => Promise<TResult> | TResult,
  options: {
    getAuth: (context: TContext) => Promise<ServerAuthResult | null>
    onUnauthorized?: (context: TContext) => Promise<TResult> | TResult
  },
): (context: TContext) => Promise<TResult> {
  return async (context: TContext): Promise<TResult> => {
    const auth = await options.getAuth(context)

    if (!auth) {
      if (options.onUnauthorized) {
        return options.onUnauthorized(context)
      }

      throw new Error('Unauthorized')
    }

    return handler(context, auth)
  }
}
