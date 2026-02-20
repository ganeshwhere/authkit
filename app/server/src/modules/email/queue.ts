import { Queue, Worker, type JobsOptions, type Processor, type QueueOptions } from 'bullmq'
import type Redis from 'ioredis'

import type { EmailTemplateInput, EmailTemplateType } from './templates'

export const EMAIL_QUEUE_NAME = 'authkit:email:delivery'

export type EmailQueueJobPayload = {
  to: string
  template: EmailTemplateType
  variables: EmailTemplateInput
  from?: string
  replyTo?: string
}

const RETRY_DELAYS_MS = [0, 5000, 30000, 300000, 1800000]

export function emailRetryDelay(attemptsMade: number): number {
  const index = Math.min(attemptsMade, RETRY_DELAYS_MS.length - 1)
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 0
}

export function createEmailQueue(
  connection: Redis,
  options: Omit<QueueOptions, 'connection'> = {},
): Queue<EmailQueueJobPayload> {
  return new Queue<EmailQueueJobPayload>(EMAIL_QUEUE_NAME, {
    connection,
    ...options,
  })
}

export function defaultEmailJobOptions(): JobsOptions {
  return {
    attempts: 5,
    removeOnComplete: true,
    removeOnFail: 200,
    timeout: 5000,
    backoff: {
      type: 'custom',
    },
  }
}

export function createEmailWorker(
  connection: Redis,
  processor: Processor<EmailQueueJobPayload>,
): Worker<EmailQueueJobPayload> {
  return new Worker<EmailQueueJobPayload>(EMAIL_QUEUE_NAME, processor, {
    connection,
    settings: {
      backoffStrategy: (attemptsMade) => emailRetryDelay(attemptsMade),
    },
  })
}
