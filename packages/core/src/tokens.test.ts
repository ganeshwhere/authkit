import { describe, expect, it } from 'vitest'

import { MemoryTokenStorage } from './tokens'

describe('MemoryTokenStorage', () => {
  it('stores and clears access token in memory', () => {
    const storage = new MemoryTokenStorage()

    expect(storage.getAccessToken()).toBeNull()

    storage.setAccessToken('token_1')
    expect(storage.getAccessToken()).toBe('token_1')

    storage.clearAccessToken()
    expect(storage.getAccessToken()).toBeNull()
  })
})
