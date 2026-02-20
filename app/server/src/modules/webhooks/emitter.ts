import type { FastifyInstance } from 'fastify'

import {
  createWebhookEventPayload,
  type WebhookEventInput,
} from './events'

export async function emitWebhookEvent(
  server: FastifyInstance,
  eventInput: WebhookEventInput,
): Promise<void> {
  const endpoints = await server.dbAdapter.listWebhookEndpoints(eventInput.projectId)

  if (endpoints.length === 0) {
    return
  }

  const payload = createWebhookEventPayload(eventInput)

  const matchingEndpoints = endpoints.filter(
    (endpoint) => endpoint.enabled && endpoint.events.includes(eventInput.type),
  )

  await Promise.all(
    matchingEndpoints.map(async (endpoint) => {
      await server.webhookQueue.add(
        'deliver-webhook',
        {
          endpointId: endpoint.id,
          url: endpoint.url,
          secret: endpoint.secret,
          event: eventInput.type,
          payload,
          attempt: 1,
        },
        {
          delay: 0,
          removeOnComplete: true,
          removeOnFail: true,
          attempts: 1,
        },
      )
    }),
  )
}
