import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { createDrizzleDatabaseAdapter } from '../adapters/db/drizzle-adapter'
import { config } from '../config'
import { createDatabaseClient } from '../db'

const databasePlugin: FastifyPluginAsync = async (server) => {
  const { db, pool } = createDatabaseClient(config)
  const dbAdapter = createDrizzleDatabaseAdapter(db)

  server.decorate('db', db)
  server.decorate('dbPool', pool)
  server.decorate('dbAdapter', dbAdapter)

  server.addHook('onClose', async () => {
    await pool.end()
  })
}

export default fp(databasePlugin, { name: 'database' })
