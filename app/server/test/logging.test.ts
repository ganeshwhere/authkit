import { describe, expect, it } from 'vitest'

import { buildLoggerOptions } from '../src/utils/logging'

describe('buildLoggerOptions', () => {
  it('applies level and redaction policy', () => {
    const options = buildLoggerOptions('info')

    expect(options.level).toBe('info')
    expect(options.redact).toBeDefined()
    expect(options.redact).toMatchObject({
      censor: '[REDACTED]',
      remove: false,
    })
  })

  it('serializes request/response safely', () => {
    const options = buildLoggerOptions('debug')

    expect(options.serializers).toBeDefined()
    expect(options.serializers?.req).toBeTypeOf('function')
    expect(options.serializers?.res).toBeTypeOf('function')
  })
})
