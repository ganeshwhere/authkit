import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express'

export type AuthKitExpressConfig = {
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

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

async function resolveAuthContext(
  config: AuthKitExpressConfig,
  token: string,
): Promise<AuthContext | null> {
  const fetcher = config.fetch ?? globalThis.fetch

  if (!fetcher) {
    throw new Error('No fetch implementation available for @authkit/express')
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

export function authKit(config: AuthKitExpressConfig): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const token = readBearerToken(request)

    if (!token) {
      delete request.auth
      next()
      return
    }

    try {
      const authContext = await resolveAuthContext(config, token)

      if (authContext) {
        request.auth = authContext
      } else {
        delete request.auth
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireAuth(options: {
  onUnauthorized?: (request: Request, response: Response) => void
} = {}): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (request.auth?.user) {
      next()
      return
    }

    if (options.onUnauthorized) {
      options.onUnauthorized(request, response)
      return
    }

    response.status(401).json({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: {},
      },
    })
  }
}

export function optionalAuth(): RequestHandler {
  return (_request: Request, _response: Response, next: NextFunction): void => {
    next()
  }
}
