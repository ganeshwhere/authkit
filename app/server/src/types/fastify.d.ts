import type { Pool } from 'pg'

import type { AuthKitDatabase } from '../db'

declare module 'fastify' {
  interface FastifyInstance {
    db: AuthKitDatabase
    dbPool: Pool
  }
}
