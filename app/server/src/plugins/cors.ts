import fastifyCors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { config } from '../config'

const corsPlugin: FastifyPluginAsync = async (server) => {
  const allowedOrigins = new Set(config.corsOrigins)

  await server.register(fastifyCors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed'), false)
    },
  })
}

export default fp(corsPlugin, { name: 'cors' })
