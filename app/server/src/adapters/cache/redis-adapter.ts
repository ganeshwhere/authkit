import type Redis from 'ioredis'

import type { CacheAdapter } from '../../types/adapters'

export function createRedisCacheAdapter(client: Redis): CacheAdapter {
  return {
    async get(key: string): Promise<string | null> {
      return client.get(key)
    },

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, value, 'EX', ttlSeconds)
        return
      }

      await client.set(key, value)
    },

    async delete(key: string): Promise<void> {
      await client.del(key)
    },

    async increment(key: string): Promise<number> {
      return client.incr(key)
    },

    async expire(key: string, ttlSeconds: number): Promise<void> {
      await client.expire(key, ttlSeconds)
    },

    async exists(key: string): Promise<boolean> {
      const result = await client.exists(key)
      return result > 0
    },
  }
}
