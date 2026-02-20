import { describe, expect, it } from 'vitest'

import { checkSlidingWindowLimit } from '../src/middleware/rate-limit'

function createMemoryCache() {
  const store = new Map<string, string>()

  return {
    cache: {
      async get(key: string): Promise<string | null> {
        return store.get(key) ?? null
      },
      async set(key: string, value: string): Promise<void> {
        store.set(key, value)
      },
      async delete(key: string): Promise<void> {
        store.delete(key)
      },
      async increment(key: string): Promise<number> {
        const next = Number(store.get(key) ?? '0') + 1
        store.set(key, String(next))
        return next
      },
      async expire(_key: string, _ttlSeconds: number): Promise<void> {
        // no-op for memory tests
      },
      async exists(key: string): Promise<boolean> {
        return store.has(key)
      },
    },
    store,
  }
}

describe('checkSlidingWindowLimit', () => {
  it('allows requests under limit', async () => {
    const { cache } = createMemoryCache()

    const result = await checkSlidingWindowLimit({
      cache,
      key: 'rate_limit:test:signin:127.0.0.1',
      maxRequests: 5,
      windowSeconds: 60,
      nowMs: 60_000,
    })

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(5)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('blocks requests over limit', async () => {
    const { cache } = createMemoryCache()

    for (let i = 0; i < 6; i += 1) {
      await checkSlidingWindowLimit({
        cache,
        key: 'rate_limit:test:signin:127.0.0.1',
        maxRequests: 5,
        windowSeconds: 60,
        nowMs: 120_000,
      })
    }

    const blocked = await checkSlidingWindowLimit({
      cache,
      key: 'rate_limit:test:signin:127.0.0.1',
      maxRequests: 5,
      windowSeconds: 60,
      nowMs: 120_500,
    })

    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})
