import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  nextWebhookRetryDelayMs,
  processWebhookDeliveryJob,
} from '../src/modules/webhooks/queue'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('webhook queue processing', () => {
  it('returns configured retry delays', () => {
    expect(nextWebhookRetryDelayMs(1)).toBe(5_000)
    expect(nextWebhookRetryDelayMs(2)).toBe(30_000)
    expect(nextWebhookRetryDelayMs(3)).toBe(300_000)
    expect(nextWebhookRetryDelayMs(4)).toBe(1_800_000)
    expect(nextWebhookRetryDelayMs(5)).toBeNull()
  })

  it('marks delivery as successful for 2xx responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    )

    const createWebhookDelivery = vi.fn(async () => ({ id: 'delivery_1' }))
    const markWebhookDeliveryResult = vi.fn(async () => undefined)
    const queueAdd = vi.fn(async () => undefined)

    await processWebhookDeliveryJob({
      dbAdapter: {
        createWebhookDelivery,
        markWebhookDeliveryResult,
      } as never,
      queue: {
        add: queueAdd,
      } as never,
      jobPayload: {
        endpointId: 'endpoint_1',
        url: 'https://hooks.example.com/events',
        secret: 'secret',
        event: 'user.created',
        payload: {
          id: 'evt_1',
          type: 'user.created',
          projectId: 'project_1',
          createdAt: new Date().toISOString(),
          data: { user: { id: 'user_1' } },
        },
        attempt: 1,
      },
    })

    expect(createWebhookDelivery).toHaveBeenCalledTimes(1)
    expect(markWebhookDeliveryResult).toHaveBeenCalledWith({
      id: 'delivery_1',
      responseStatus: 200,
      responseBody: 'ok',
      delivered: true,
    })
    expect(queueAdd).not.toHaveBeenCalled()
  })

  it('schedules retry when delivery fails before max attempts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('timeout'))))

    const createWebhookDelivery = vi.fn(async () => ({ id: 'delivery_2' }))
    const markWebhookDeliveryResult = vi.fn(async () => undefined)
    const queueAdd = vi.fn(async () => undefined)

    await processWebhookDeliveryJob({
      dbAdapter: {
        createWebhookDelivery,
        markWebhookDeliveryResult,
      } as never,
      queue: {
        add: queueAdd,
      } as never,
      jobPayload: {
        endpointId: 'endpoint_1',
        url: 'https://hooks.example.com/events',
        secret: 'secret',
        event: 'user.created',
        payload: {
          id: 'evt_1',
          type: 'user.created',
          projectId: 'project_1',
          createdAt: new Date().toISOString(),
          data: { user: { id: 'user_1' } },
        },
        attempt: 1,
      },
    })

    expect(markWebhookDeliveryResult).toHaveBeenCalledWith({
      id: 'delivery_2',
      responseStatus: 0,
      responseBody: 'timeout',
      delivered: false,
    })

    expect(queueAdd).toHaveBeenCalledWith(
      'deliver-webhook',
      expect.objectContaining({
        attempt: 2,
      }),
      expect.objectContaining({
        delay: 5_000,
      }),
    )
  })

  it('does not schedule retry after final attempt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('failed', {
          status: 500,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    )

    const queueAdd = vi.fn(async () => undefined)

    await processWebhookDeliveryJob({
      dbAdapter: {
        createWebhookDelivery: vi.fn(async () => ({ id: 'delivery_3' })),
        markWebhookDeliveryResult: vi.fn(async () => undefined),
      } as never,
      queue: {
        add: queueAdd,
      } as never,
      jobPayload: {
        endpointId: 'endpoint_1',
        url: 'https://hooks.example.com/events',
        secret: 'secret',
        event: 'user.created',
        payload: {
          id: 'evt_1',
          type: 'user.created',
          projectId: 'project_1',
          createdAt: new Date().toISOString(),
          data: { user: { id: 'user_1' } },
        },
        attempt: 5,
      },
    })

    expect(queueAdd).not.toHaveBeenCalled()
  })
})
