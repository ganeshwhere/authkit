import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { config } from '../config'
import { createDatabaseClient } from './index'

async function runMigrations(): Promise<void> {
  const client = createDatabaseClient(config)

  try {
    await migrate(client.db, { migrationsFolder: 'src/db/migrations' })
  } finally {
    await client.pool.end()
  }
}

void runMigrations()
