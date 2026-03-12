import { describe, expect, it } from 'vitest'

import { defaultEmailJobOptions, emailRetryDelay } from '../src/modules/email/queue'

describe('email queue config', () => {
  it('uses expected retry delay schedule', () => {
    expect(emailRetryDelay(0)).toBe(0)
    expect(emailRetryDelay(1)).toBe(5000)
    expect(emailRetryDelay(2)).toBe(30000)
    expect(emailRetryDelay(3)).toBe(300000)
    expect(emailRetryDelay(4)).toBe(1800000)
    expect(emailRetryDelay(10)).toBe(1800000)
  })

  it('uses five-attempt default job options with custom backoff', () => {
    const options = defaultEmailJobOptions()

    expect(options.attempts).toBe(5)
    expect(options.backoff).toMatchObject({ type: 'custom' })
  })
})
