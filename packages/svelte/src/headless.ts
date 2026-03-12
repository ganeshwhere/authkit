import type {
  AuthKitError,
  AuthResult,
  MFARequiredResult,
  OAuthOptions,
  OAuthProvider,
  TOTPSetupResult,
} from '@authkit/core'
import {
  readonly,
  writable,
  type Readable,
} from 'svelte/store'

import type { AuthKitStore } from './store'
import { normalizeAuthKitError } from './utils'

type AsyncActionState = {
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
  run: <T>(action: () => Promise<T>) => Promise<T>
}

function createAsyncActionState(): AsyncActionState {
  const isLoadingStore = writable(false)
  const errorStore = writable<AuthKitError | null>(null)

  async function run<T>(action: () => Promise<T>): Promise<T> {
    isLoadingStore.set(true)
    errorStore.set(null)

    try {
      return await action()
    } catch (error) {
      const normalized = normalizeAuthKitError(error)
      errorStore.set(normalized)
      throw normalized
    } finally {
      isLoadingStore.set(false)
    }
  }

  return {
    isLoading: readonly(isLoadingStore),
    error: readonly(errorStore),
    run,
  }
}

export function createSignInActions(store: AuthKitStore): {
  signIn: (email: string, password: string) => Promise<AuthResult | MFARequiredResult>
  signInWithOAuth: (provider: OAuthProvider, options?: OAuthOptions) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
} {
  const asyncState = createAsyncActionState()

  return {
    signIn: async (email: string, password: string) =>
      asyncState.run(() => store.client.signIn(email, password)),
    signInWithOAuth: async (provider: OAuthProvider, options?: OAuthOptions) =>
      asyncState.run(() => store.client.signInWithOAuth(provider, options)),
    signInWithMagicLink: async (email: string) =>
      asyncState.run(() => store.client.signInWithMagicLink(email)),
    isLoading: asyncState.isLoading,
    error: asyncState.error,
  }
}

export function createSignUpActions(store: AuthKitStore): {
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
} {
  const asyncState = createAsyncActionState()

  return {
    signUp: async (email: string, password: string, displayName?: string) =>
      asyncState.run(() =>
        store.client.signUp(email, password, displayName ? { displayName } : undefined),
      ),
    isLoading: asyncState.isLoading,
    error: asyncState.error,
  }
}

export function createMagicLinkActions(store: AuthKitStore): {
  send: (email: string) => Promise<void>
  verify: (token: string) => Promise<AuthResult>
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
} {
  const asyncState = createAsyncActionState()

  return {
    send: async (email: string) => asyncState.run(() => store.client.signInWithMagicLink(email)),
    verify: async (token: string) => asyncState.run(() => store.client.verifyMagicLink(token)),
    isLoading: asyncState.isLoading,
    error: asyncState.error,
  }
}

export function createMFAActions(store: AuthKitStore): {
  setup: () => Promise<TOTPSetupResult>
  enable: (code: string) => Promise<void>
  disable: (code: string) => Promise<void>
  verify: (mfaToken: string, code: string) => Promise<AuthResult>
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
} {
  const asyncState = createAsyncActionState()

  return {
    setup: async () => asyncState.run(() => store.client.setupTOTP()),
    enable: async (code: string) => asyncState.run(() => store.client.enableTOTP(code)),
    disable: async (code: string) => asyncState.run(() => store.client.disableTOTP(code)),
    verify: async (mfaToken: string, code: string) =>
      asyncState.run(() => store.client.verifyMFA(mfaToken, code)),
    isLoading: asyncState.isLoading,
    error: asyncState.error,
  }
}

export function createPasskeyActions(store: AuthKitStore): {
  register: (displayName?: string) => Promise<void>
  authenticate: () => Promise<AuthResult>
  remove: (passkeyId: string) => Promise<void>
  isLoading: Readable<boolean>
  error: Readable<AuthKitError | null>
} {
  const asyncState = createAsyncActionState()

  return {
    register: async (displayName?: string) =>
      asyncState.run(() => store.client.registerPasskey(displayName)),
    authenticate: async () => asyncState.run(() => store.client.authenticateWithPasskey()),
    remove: async (passkeyId: string) => asyncState.run(() => store.client.removePasskey(passkeyId)),
    isLoading: asyncState.isLoading,
    error: asyncState.error,
  }
}
