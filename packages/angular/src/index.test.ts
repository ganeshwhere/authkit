import { describe, expect, it } from 'vitest'

import {
  AuthKitService,
  authKitGuard,
  authKitInterceptor,
  provideAuthKit,
  withBearerToken,
} from './index'

describe('@authkit/angular exports', () => {
  it('provides service, guard, and interceptor APIs', () => {
    expect(typeof AuthKitService).toBe('function')
    expect(typeof provideAuthKit).toBe('function')
    expect(typeof authKitGuard).toBe('function')
    expect(typeof authKitInterceptor).toBe('function')
    expect(typeof withBearerToken).toBe('function')
  })
})
