import type { CacheAdapter } from '../types/adapters'

export type SlidingWindowRateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: Date
}

export async function checkSlidingWindowLimit(params: {
  cache: CacheAdapter
  key: string
  maxRequests: number
  windowSeconds: number
  nowMs?: number
}): Promise<SlidingWindowRateLimitResult> {
  const now = params.nowMs ?? Date.now()
  const windowMs = params.windowSeconds * 1000

  const currentWindowStartMs = Math.floor(now / windowMs) * windowMs
  const previousWindowStartMs = currentWindowStartMs - windowMs

  const currentWindowKey = `${params.key}:${currentWindowStartMs}`
  const previousWindowKey = `${params.key}:${previousWindowStartMs}`

  const currentCount = await params.cache.increment(currentWindowKey)
  await params.cache.expire(currentWindowKey, params.windowSeconds * 2)

  const previousCountRaw = await params.cache.get(previousWindowKey)
  const previousCount = Number(previousCountRaw ?? 0)

  const elapsedMs = now - currentWindowStartMs
  const previousWeight = Math.max(0, (windowMs - elapsedMs) / windowMs)

  const estimatedCount = currentCount + previousCount * previousWeight
  const allowed = estimatedCount <= params.maxRequests

  const remaining = Math.max(0, Math.floor(params.maxRequests - estimatedCount))
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((windowMs - elapsedMs) / 1000))

  return {
    allowed,
    limit: params.maxRequests,
    remaining,
    retryAfterSeconds,
    resetAt: new Date(currentWindowStartMs + windowMs),
  }
}
