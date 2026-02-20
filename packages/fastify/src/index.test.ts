import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import { authKit, requireAuth } from './index'

describe('@authkit/fastify', () => {
  it('attaches auth context and enforces requireAuth preHandler', async () => {
    const server = Fastify()

    await server.register(authKit, {
      projectId: 'project_1',
      baseUrl: 'https://api.example.com',
      fetch: vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              user: {
                id: 'user_1',
                projectId: 'project_1',
                email: 'user@example.com',
                emailVerified: true,
                displayName: 'User',
                avatarUrl: null,
                metadata: {},
              },
              sessions: [],
            },
            error: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ) as never,
    })

    server.get('/protected', { preHandler: requireAuth() }, async (request) => ({
      userId: request.auth?.user.id,
    }))

    const unauthorized = await server.inject({
      method: 'GET',
      url: '/protected',
    })

    expect(unauthorized.statusCode).toBe(401)

    const authorized = await server.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: 'Bearer token_1',
      },
    })

    expect(authorized.statusCode).toBe(200)
    expect(authorized.json().userId).toBe('user_1')

    await server.close()
  })
})
