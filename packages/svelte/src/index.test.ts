import { describe, expect, it } from 'vitest'

import {
  createAuthKitStore,
  createMFAActions,
  createMagicLinkActions,
  createPasskeyActions,
  createSignInActions,
  createSignUpActions,
} from './index'

describe('@authkit/svelte exports', () => {
  it('provides store creator and auth helpers', () => {
    expect(typeof createAuthKitStore).toBe('function')
    expect(typeof createSignInActions).toBe('function')
    expect(typeof createSignUpActions).toBe('function')
    expect(typeof createMagicLinkActions).toBe('function')
    expect(typeof createMFAActions).toBe('function')
    expect(typeof createPasskeyActions).toBe('function')
  })
})
