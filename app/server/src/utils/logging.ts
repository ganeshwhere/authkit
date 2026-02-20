import type { FastifyBaseLogger } from 'fastify'
import type { LoggerOptions } from 'pino'

export function buildLoggerOptions(level: string): LoggerOptions<FastifyBaseLogger> {
  return {
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
      remove: false,
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        ip: req.ip,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  }
}
