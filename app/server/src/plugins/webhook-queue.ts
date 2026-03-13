import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import {
  emitWebhookEvent as emitWebhookEventInternal,
} from '../modules/webhooks/emitter'
import type { WebhookEventInput } from '../modules/webhooks/events'
import {
  createWebhookQueue,
  createWebhookWorker,
} from '../modules/webhooks/queue'

const webhookQueuePlugin: FastifyPluginAsync = async (server) => {
  const queue = createWebhookQueue(server.redis)
  const worker = createWebhookWorker({
    redis: server.redis,
    dbAdapter: server.dbAdapter,
    queue,
  })

  worker.on('failed', (job, error) => {
    server.log.error(
      {
        jobId: job?.id,
        endpointId: job?.data.endpointId,
        attempt: job?.data.attempt,
        error,
      },
      'Webhook delivery job failed',
    )
  })

  server.decorate('webhookQueue', queue)
  server.decorate('emitWebhookEvent', async (event: WebhookEventInput) => {
    await emitWebhookEventInternal(server, event)
  })

  server.addHook('onClose', async () => {
    await Promise.all([worker.close(), queue.close()])
  })
}

export default fp(webhookQueuePlugin, { name: 'webhook-queue' })
