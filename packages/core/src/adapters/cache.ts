export interface CacheAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  increment(key: string): Promise<number>
  expire(key: string, ttlSeconds: number): Promise<void>
  exists(key: string): Promise<boolean>
}
