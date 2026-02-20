import type { FastifyPluginAsync } from 'fastify'

import { config } from '../config'
import { checkDatabaseReadiness } from '../db'
import { buildJwks } from '../utils/jwks'

const systemRoutes: FastifyPluginAsync = async (server) => {
  server.get('/.well-known/jwks.json', async () => {
    const keys = [config.jwtPublicKey]

    if (config.jwtPublicKeyPrevious) {
      keys.push(config.jwtPublicKeyPrevious)
    }

    return {
      data: await buildJwks(keys),
      error: null,
    }
  })

  server.get('/health', async () => ({
    data: {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: Math.floor(process.uptime()),
    },
    error: null,
  }))

  server.get('/ready', async (request, reply) => {
    const dbReady = await checkDatabaseReadiness(request.server.dbPool)
    const redisReady = (await request.server.redis.ping()) === 'PONG'

    const ready = dbReady && redisReady

    if (!ready) {
      reply.code(503)
    }

    return {
      data: {
        status: ready ? 'ready' : 'not_ready',
        checks: {
          db: dbReady,
          redis: redisReady,
        },
      },
      error: null,
    }
  })
}

export default systemRoutes
