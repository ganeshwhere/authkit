import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'

import type { AppConfig } from '../config'
import * as schema from './schema'

export type AuthKitDatabase = NodePgDatabase<typeof schema>

export type DatabaseClient = {
  pool: Pool
  db: AuthKitDatabase
}

export function createDatabasePoolConfig(config: AppConfig): PoolConfig {
  return {
    connectionString: config.databaseUrl,
    min: config.databasePoolMin,
    max: config.databasePoolMax,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  }
}

export function createDatabaseClient(config: AppConfig): DatabaseClient {
  const pool = new Pool(createDatabasePoolConfig(config))
  const db = drizzle(pool, { schema })

  return {
    pool,
    db,
  }
}

export async function checkDatabaseReadiness(pool: Pool): Promise<boolean> {
  try {
    await pool.query('select 1 as ok')
    return true
  } catch {
    return false
  }
}
