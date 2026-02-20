import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const securityHeadersPlugin: FastifyPluginAsync = async (server) => {
  server.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '0')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    reply.header('Content-Security-Policy', "default-src 'none'")

    if (request.url.startsWith('/v1/auth')) {
      reply.header('Cache-Control', 'no-store')
    }

    if (request.protocol === 'https') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    return payload
  })
}

export default fp(securityHeadersPlugin, { name: 'security-headers' })
