import { describe, expect, it, vi } from 'vitest'

import { emitWebhookEvent } from '../src/modules/webhooks/emitter'

describe('webhook emitter', () => {
  it('queues deliveries only for enabled and subscribed endpoints', async () => {
    const listWebhookEndpoints = vi.fn(async () => [
      {
        id: 'endpoint_1',
        projectId: 'project_1',
        url: 'https://hooks.example.com/one',
        secret: 'secret-1',
        events: ['user.created', 'user.updated'],
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'endpoint_2',
        projectId: 'project_1',
        url: 'https://hooks.example.com/two',
        secret: 'secret-2',
        events: ['user.updated'],
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'endpoint_3',
        projectId: 'project_1',
        url: 'https://hooks.example.com/three',
        secret: 'secret-3',
        events: ['user.created'],
        enabled: false,
        createdAt: new Date(),
      },
    ])

    const add = vi.fn(async () => undefined)

    const server = {
      dbAdapter: {
        listWebhookEndpoints,
      },
      webhookQueue: {
        add,
      },
    }

    await emitWebhookEvent(server as never, {
      type: 'user.created',
      projectId: 'project_1',
      data: {
        user: {
          id: 'user_1',
        },
      },
    })

    expect(listWebhookEndpoints).toHaveBeenCalledWith('project_1')
    expect(add).toHaveBeenCalledTimes(1)

    const payload = add.mock.calls[0]?.[1]
    expect(payload.endpointId).toBe('endpoint_1')
    expect(payload.event).toBe('user.created')
    expect(payload.payload.type).toBe('user.created')
  })
})
