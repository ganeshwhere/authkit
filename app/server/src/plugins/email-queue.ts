import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import {
  createEmailQueue,
  createEmailWorker,
  defaultEmailJobOptions,
  type EmailQueueJobPayload,
} from '../modules/email/queue'

const emailQueuePlugin: FastifyPluginAsync = async (server) => {
  const queue = createEmailQueue(server.redis)

  const worker = createEmailWorker(server.redis, async (job) => {
    await server.emailService.sendTemplate(job.data)
  })

  server.decorate('emailQueue', queue)
  server.decorate('enqueueEmail', async (payload: EmailQueueJobPayload) => {
    await queue.add('send-template-email', payload, defaultEmailJobOptions())
  })

  server.addHook('onClose', async () => {
    await worker.close()
    await queue.close()
  })
}

export default fp(emailQueuePlugin, { name: 'email-queue' })
