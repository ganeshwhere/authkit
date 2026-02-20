export type AuthMiddlewareOptions = {
  publicRoutes?: string[]
  ignoredRoutes?: string[]
  signInPath?: string
  validateToken?: (token: string) => boolean | Promise<boolean>
}

export type AuthMiddlewareRequest = {
  pathname: string
  headers?: Headers | Record<string, string | undefined>
  cookies?: Record<string, string | undefined>
  url?: string
}

export type AuthMiddlewareResult = {
  authorized: boolean
  redirectTo?: string
}

function routePatternToRegExp(pattern: string): RegExp {
  if (pattern.includes('(') || pattern.includes('[') || pattern.includes('.*')) {
    return new RegExp(`^${pattern}$`)
  }

  return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
}

function matchesRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => routePatternToRegExp(pattern).test(pathname))
}

function readHeaderToken(headers?: Headers | Record<string, string | undefined>): string | null {
  if (!headers) {
    return null
  }

  const authorization =
    headers instanceof Headers
      ? headers.get('authorization')
      : headers.authorization ?? headers.Authorization

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice('Bearer '.length).trim()
}

function readCookieToken(cookies?: Record<string, string | undefined>): string | null {
  if (!cookies) {
    return null
  }

  return cookies.access_token ?? null
}

export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  const publicRoutes = options.publicRoutes ?? []
  const ignoredRoutes = options.ignoredRoutes ?? []
  const signInPath = options.signInPath ?? '/login'

  return async (request: AuthMiddlewareRequest): Promise<AuthMiddlewareResult> => {
    if (matchesRoute(request.pathname, ignoredRoutes)) {
      return { authorized: true }
    }

    if (matchesRoute(request.pathname, publicRoutes)) {
      return { authorized: true }
    }

    const token = readHeaderToken(request.headers) ?? readCookieToken(request.cookies)

    if (!token) {
      return {
        authorized: false,
        redirectTo: signInPath,
      }
    }

    if (options.validateToken) {
      const valid = await options.validateToken(token)

      if (!valid) {
        return {
          authorized: false,
          redirectTo: signInPath,
        }
      }
    }

    return { authorized: true }
  }
}
