import { describe, expect, it, vi } from 'vitest'

import { createRedisCacheAdapter } from '../src/adapters/cache/redis-adapter'

describe('createRedisCacheAdapter', () => {
  it('maps adapter methods to redis commands', async () => {
    const redis = {
      get: vi.fn(async () => 'value'),
      set: vi.fn(async () => 'OK'),
      del: vi.fn(async () => 1),
      incr: vi.fn(async () => 2),
      expire: vi.fn(async () => 1),
      exists: vi.fn(async () => 1),
    }

    const adapter = createRedisCacheAdapter(redis as never)

    await expect(adapter.get('k')).resolves.toBe('value')
    await adapter.set('k', 'v', 10)
    await adapter.delete('k')
    await expect(adapter.increment('k')).resolves.toBe(2)
    await adapter.expire('k', 20)
    await expect(adapter.exists('k')).resolves.toBe(true)

    expect(redis.set).toHaveBeenCalledWith('k', 'v', 'EX', 10)
  })
})
