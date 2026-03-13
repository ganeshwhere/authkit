import { config } from './config'

import { buildServer } from './index'

const start = async (): Promise<void> => {
  const server = await buildServer()
  await server.listen({ host: config.host, port: config.port })
}

void start()
