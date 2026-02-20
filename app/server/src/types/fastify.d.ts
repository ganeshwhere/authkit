import type { Pool } from 'pg'
import type Redis from 'ioredis'

import type { AuthKitDatabase } from '../db'
import type { CacheAdapter } from './adapters'

declare module 'fastify' {
  interface FastifyInstance {
    db: AuthKitDatabase
    dbPool: Pool
    redis: Redis
    cache: CacheAdapter
  }
}
