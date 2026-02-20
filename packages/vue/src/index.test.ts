import { describe, expect, it } from 'vitest'

import {
  createAuthKit,
  createAuthKitPlugin,
  provideAuthKit,
  useAuth,
  useAuthKit,
  useAuthKitContext,
  useMagicLink,
  useMFA,
  usePasskeys,
  useSession,
  useSignIn,
  useSignUp,
  useUser,
} from './index'

describe('@authkit/vue exports', () => {
  it('provides provider utilities and composables', () => {
    expect(typeof createAuthKit).toBe('function')
    expect(typeof createAuthKitPlugin).toBe('function')
    expect(typeof provideAuthKit).toBe('function')
    expect(typeof useAuthKitContext).toBe('function')
    expect(typeof useAuthKit).toBe('function')
    expect(typeof useAuth).toBe('function')
    expect(typeof useUser).toBe('function')
    expect(typeof useSession).toBe('function')
    expect(typeof useSignIn).toBe('function')
    expect(typeof useSignUp).toBe('function')
    expect(typeof useMagicLink).toBe('function')
    expect(typeof useMFA).toBe('function')
    expect(typeof usePasskeys).toBe('function')
  })
})
