import { buildServer } from './index'
import { config } from './config'

const start = async (): Promise<void> => {
  const server = await buildServer()
  await server.listen({ host: config.host, port: config.port })
}

void start()
