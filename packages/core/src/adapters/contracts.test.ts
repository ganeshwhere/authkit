import { describe, expectTypeOf, it } from 'vitest'

import type { CacheAdapter } from './cache'
import type { DatabaseAdapter } from './db'
import type { EmailAdapter } from './email'

describe('adapter contracts', () => {
  it('exposes database contract methods', () => {
    expectTypeOf<DatabaseAdapter['createUser']>().toBeFunction()
    expectTypeOf<DatabaseAdapter['createSession']>().toBeFunction()
    expectTypeOf<DatabaseAdapter['getAuditLogs']>().toBeFunction()
  })

  it('exposes cache and email contracts', () => {
    expectTypeOf<CacheAdapter['get']>().toBeFunction()
    expectTypeOf<CacheAdapter['set']>().toBeFunction()
    expectTypeOf<EmailAdapter['send']>().toBeFunction()
  })
})
