import { describe, expect, it } from 'vitest'

import { authMiddleware } from './middleware'

describe('authMiddleware', () => {
  it('allows public routes without token', async () => {
    const middleware = authMiddleware({
      publicRoutes: ['/', '/login'],
    })

    const result = await middleware({
      pathname: '/login',
    })

    expect(result.authorized).toBe(true)
  })

  it('redirects protected routes without token', async () => {
    const middleware = authMiddleware({
      publicRoutes: ['/login'],
      signInPath: '/login',
    })

    const result = await middleware({
      pathname: '/dashboard',
    })

    expect(result.authorized).toBe(false)
    expect(result.redirectTo).toBe('/login')
  })

  it('supports custom token validation', async () => {
    const middleware = authMiddleware({
      validateToken: async (token) => token === 'valid-token',
      signInPath: '/signin',
    })

    const denied = await middleware({
      pathname: '/settings',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    const allowed = await middleware({
      pathname: '/settings',
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(denied.authorized).toBe(false)
    expect(denied.redirectTo).toBe('/signin')
    expect(allowed.authorized).toBe(true)
  })
})
