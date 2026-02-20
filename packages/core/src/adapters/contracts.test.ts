import { describe, expectTypeOf, it } from 'vitest'

import type { CacheAdapter } from './cache'
import type { DatabaseAdapter } from './db'
import type { EmailAdapter } from './email'

describe('adapter contracts', () => {
  it('exposes database contract methods', () => {
    expectTypeOf<DatabaseAdapter>().toMatchTypeOf<{
      createUser: (...args: unknown[]) => Promise<unknown>
      createSession: (...args: unknown[]) => Promise<unknown>
      getAuditLogs: (...args: unknown[]) => Promise<unknown>
    }>()
  })

  it('exposes cache and email contracts', () => {
    expectTypeOf<CacheAdapter>().toMatchTypeOf<{
      get: (key: string) => Promise<string | null>
      set: (key: string, value: string, ttlSeconds?: number) => Promise<void>
    }>()

    expectTypeOf<EmailAdapter>().toMatchTypeOf<{
      send: (message: unknown) => Promise<void>
    }>()
  })
})
