import Fastify, { type FastifyInstance } from 'fastify'

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: true })

  return server
}
