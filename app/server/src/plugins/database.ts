import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { config } from '../config'
import { createDatabaseClient } from '../db'

const databasePlugin: FastifyPluginAsync = async (server) => {
  const { db, pool } = createDatabaseClient(config)

  server.decorate('db', db)
  server.decorate('dbPool', pool)

  server.addHook('onClose', async () => {
    await pool.end()
  })
}

export default fp(databasePlugin, { name: 'database' })
