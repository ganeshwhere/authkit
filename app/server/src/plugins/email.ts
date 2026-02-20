import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { createLogEmailAdapter } from '../adapters/email/log-email-adapter'
import { config } from '../config'
import { EmailService } from '../modules/email/service'

const emailPlugin: FastifyPluginAsync = async (server) => {
  const emailAdapter = createLogEmailAdapter(server.log)
  const emailService = new EmailService(emailAdapter, config.emailFrom)

  server.decorate('emailAdapter', emailAdapter)
  server.decorate('emailService', emailService)
}

export default fp(emailPlugin, { name: 'email' })
