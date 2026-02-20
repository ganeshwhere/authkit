import { describe, expect, it } from 'vitest'

import { SignIn, SignUp, UserButton, UserProfile } from './components'

describe('react components exports', () => {
  it('provides component factories', () => {
    expect(typeof SignIn).toBe('function')
    expect(typeof SignUp).toBe('function')
    expect(typeof UserButton).toBe('function')
    expect(typeof UserProfile).toBe('function')
  })
})
