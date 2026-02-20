import { describe, expect, it } from 'vitest'

import type { DatabaseAdapter } from '../src/types/adapters'
import { createDrizzleDatabaseAdapter } from '../src/adapters/db/drizzle-adapter'

describe('createDrizzleDatabaseAdapter', () => {
  it('returns a database adapter shape', () => {
    const adapter = createDrizzleDatabaseAdapter({} as never)

    expect(adapter).toBeDefined()

    const typed: DatabaseAdapter = adapter
    expect(typeof typed.createUser).toBe('function')
    expect(typeof typed.createSession).toBe('function')
    expect(typeof typed.createAuditLog).toBe('function')
    expect(typeof typed.createWebhookEndpoint).toBe('function')
  })
})
