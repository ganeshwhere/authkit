import Fastify, { type FastifyInstance } from 'fastify'

import { config } from './config'
import { globalErrorHandler } from './utils/error-handler'
import { buildLoggerOptions } from './utils/logging'

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: buildLoggerOptions(config.logLevel),
    trustProxy: config.trustProxy,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: false,
        strict: true,
      },
    },
  })

  await server.register(import('./plugins/security-headers'))
  await server.register(import('./plugins/cors'))
  await server.register(import('./plugins/rate-limiter'))
  await server.register(import('./plugins/database'))
  await server.register(import('./plugins/cache'))
  await server.register(import('./plugins/email'))
  await server.register(import('./plugins/email-queue'))
  await server.register(import('./plugins/auth'))

  await server.register(import('./routes/auth'), { prefix: '/v1/auth' })
  await server.register(import('./routes/user'), { prefix: '/v1/user' })
  await server.register(import('./routes/management'), { prefix: '/v1/api' })
  await server.register(import('./routes/system'))

  server.setErrorHandler(globalErrorHandler)

  return server
}
