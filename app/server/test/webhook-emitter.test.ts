import { describe, expect, it, vi } from 'vitest'

import { emitWebhookEvent } from '../src/modules/webhooks/emitter'
import type { WebhookDeliveryJobPayload } from '../src/modules/webhooks/queue'

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

    const add = vi.fn<
      (
        name: string,
        payload: WebhookDeliveryJobPayload,
        options?: Record<string, unknown>,
      ) => Promise<void>
    >(async () => undefined)

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
    expect(add).toHaveBeenNthCalledWith(
      1,
      'deliver-webhook',
      expect.objectContaining({
        endpointId: 'endpoint_1',
        event: 'user.created',
        payload: expect.objectContaining({
          type: 'user.created',
        }),
      }),
      expect.objectContaining({
        delay: 0,
        attempts: 1,
      }),
    )
  })
})
