import type { Pool } from 'pg'
import type Redis from 'ioredis'

import type { DatabaseAdapter } from './adapters'
import type { AuthKitDatabase } from '../db'
import type { CacheAdapter } from './adapters'

declare module 'fastify' {
  interface FastifyInstance {
    db: AuthKitDatabase
    dbPool: Pool
    dbAdapter: DatabaseAdapter
    redis: Redis
    cache: CacheAdapter
  }
}
