import type { QueueOptions, WorkerOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'

import type { DatabaseAdapter } from '../../types/adapters'

import type { WebhookEventPayload } from './events'
import { buildWebhookSignatureHeader } from './signature'

export const WEBHOOK_QUEUE_NAME = 'authkit:webhooks:delivery'

const RETRY_DELAYS_MS = [0, 5_000, 30_000, 300_000, 1_800_000] as const

export type WebhookDeliveryJobPayload = {
  endpointId: string
  url: string
  secret: string
  event: string
  payload: WebhookEventPayload
  attempt: number
}

export function nextWebhookRetryDelayMs(currentAttempt: number): number | null {
  const nextIndex = currentAttempt

  if (nextIndex >= RETRY_DELAYS_MS.length) {
    return null
  }

  return RETRY_DELAYS_MS[nextIndex] ?? null
}

export function createWebhookQueue(redis: unknown): Queue<WebhookDeliveryJobPayload> {
  const options: QueueOptions = {
    connection: redis as QueueOptions['connection'],
  }

  return new Queue<WebhookDeliveryJobPayload>(WEBHOOK_QUEUE_NAME, options)
}

export async function processWebhookDeliveryJob(params: {
  dbAdapter: DatabaseAdapter
  queue: Queue<WebhookDeliveryJobPayload>
  jobPayload: WebhookDeliveryJobPayload
}): Promise<void> {
  const payloadString = JSON.stringify(params.jobPayload.payload)
  const signature = buildWebhookSignatureHeader(payloadString, params.jobPayload.secret)

  const delivery = await params.dbAdapter.createWebhookDelivery({
    endpointId: params.jobPayload.endpointId,
    event: params.jobPayload.event,
    payload: params.jobPayload.payload,
    attempt: params.jobPayload.attempt,
  })

  let status = 0
  let responseBody = ''
  let delivered = false

  try {
    const response = await fetch(params.jobPayload.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-authkit-signature': signature,
      },
      body: payloadString,
      signal: AbortSignal.timeout(5000),
    })

    status = response.status
    responseBody = await response.text()
    delivered = response.ok
  } catch (error) {
    status = 0
    responseBody = error instanceof Error ? error.message : 'Webhook request failed'
    delivered = false
  }

  await params.dbAdapter.markWebhookDeliveryResult({
    id: delivery.id,
    responseStatus: status,
    responseBody,
    delivered,
  })

  if (delivered) {
    return
  }

  const delay = nextWebhookRetryDelayMs(params.jobPayload.attempt)

  if (delay === null) {
    return
  }

  await params.queue.add(
    'deliver-webhook',
    {
      ...params.jobPayload,
      attempt: params.jobPayload.attempt + 1,
    },
    {
      delay,
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 1,
    },
  )
}

export function createWebhookWorker(params: {
  redis: unknown
  dbAdapter: DatabaseAdapter
  queue: Queue<WebhookDeliveryJobPayload>
}): Worker<WebhookDeliveryJobPayload> {
  const workerOptions: WorkerOptions = {
    connection: params.redis as WorkerOptions['connection'],
  }

  return new Worker<WebhookDeliveryJobPayload>(
    WEBHOOK_QUEUE_NAME,
    async (job) => {
      await processWebhookDeliveryJob({
        dbAdapter: params.dbAdapter,
        queue: params.queue,
        jobPayload: job.data,
      })
    },
    workerOptions,
  )
}
