import type { Queue } from 'bullmq'
import type { Pool } from 'pg'
import type Redis from 'ioredis'

import type { DatabaseAdapter } from './adapters'
import type { AuthKitDatabase } from '../db'
import type { CacheAdapter, EmailAdapter } from './adapters'
import type { EmailService } from '../modules/email/service'
import type { EmailQueueJobPayload } from '../modules/email/queue'
import type { WebhookDeliveryJobPayload } from '../modules/webhooks/queue'
import type { WebhookEventInput } from '../modules/webhooks/events'
import type { AuditEventInput } from '../modules/audit/emitter'

declare module 'fastify' {
  interface FastifyInstance {
    db: AuthKitDatabase
    dbPool: Pool
    dbAdapter: DatabaseAdapter
    redis: Redis
    cache: CacheAdapter
    emailAdapter: EmailAdapter
    emailService: EmailService
    emailQueue: Queue<EmailQueueJobPayload>
    enqueueEmail: (payload: EmailQueueJobPayload) => Promise<void>
    emitAuditEvent: (event: AuditEventInput) => Promise<void>
    webhookQueue: Queue<WebhookDeliveryJobPayload>
    emitWebhookEvent: (event: WebhookEventInput) => Promise<void>
  }
}
