import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'

describe('audit plugin', () => {
  it('persists audit events through decorated emitter', async () => {
    const createAuditLog = vi.fn(async () => undefined)

    const server = Fastify()
    server.decorate('dbAdapter', {
      createAuditLog,
    } as never)

    await server.register(import('../src/plugins/audit'))

    await server.emitAuditEvent({
      projectId: 'project_1',
      userId: 'user_1',
      event: 'user.created',
      metadata: {
        method: 'password',
      },
    })

    expect(createAuditLog).toHaveBeenCalledWith({
      projectId: 'project_1',
      userId: 'user_1',
      event: 'user.created',
      ipAddress: undefined,
      userAgent: undefined,
      metadata: {
        method: 'password',
      },
    })

    await server.close()
  })

  it('swallows persistence failures and keeps request flow alive', async () => {
    const createAuditLog = vi.fn(async () => {
      throw new Error('db unavailable')
    })

    const server = Fastify()
    server.decorate('dbAdapter', {
      createAuditLog,
    } as never)

    await server.register(import('../src/plugins/audit'))

    await expect(
      server.emitAuditEvent({
        projectId: 'project_1',
        event: 'user.signed_in',
      }),
    ).resolves.toBeUndefined()

    await server.close()
  })
})
