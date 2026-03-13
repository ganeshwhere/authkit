import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import Redis from 'ioredis'

import { createRedisCacheAdapter } from '../adapters/cache/redis-adapter'
import { config } from '../config'

const cachePlugin: FastifyPluginAsync = async (server) => {
  const redis = new Redis(config.redisUrl)
  const cache = createRedisCacheAdapter(redis)

  server.decorate('redis', redis)
  server.decorate('cache', cache)

  server.addHook('onClose', async () => {
    await redis.quit()
  })
}

export default fp(cachePlugin, { name: 'cache' })
