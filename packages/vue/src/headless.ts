import type {
  AuthKitError,
  AuthResult,
  MFARequiredResult,
  OAuthOptions,
  OAuthProvider,
  TOTPSetupResult,
} from '@authkit/core'
import {
  ref,
  type Ref,
} from 'vue'

import { useAuthKitContext } from './provider'
import { normalizeAuthKitError } from './utils'

function useAsyncAction(): {
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
  run: <T>(action: () => Promise<T>) => Promise<T>
} {
  const isLoading = ref(false)
  const error = ref<AuthKitError | null>(null)

  async function run<T>(action: () => Promise<T>): Promise<T> {
    isLoading.value = true
    error.value = null

    try {
      return await action()
    } catch (cause) {
      const normalized = normalizeAuthKitError(cause)
      error.value = normalized
      throw normalized
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    run,
  }
}

export function useSignIn(): {
  signIn: (email: string, password: string) => Promise<AuthResult | MFARequiredResult>
  signInWithOAuth: (provider: OAuthProvider, options?: OAuthOptions) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    signIn: async (email: string, password: string) => run(() => client.signIn(email, password)),
    signInWithOAuth: async (provider: OAuthProvider, options?: OAuthOptions) =>
      run(() => client.signInWithOAuth(provider, options)),
    signInWithMagicLink: async (email: string) => run(() => client.signInWithMagicLink(email)),
    isLoading,
    error,
  }
}

export function useSignUp(): {
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    signUp: async (email: string, password: string, displayName?: string) =>
      run(() => client.signUp(email, password, displayName ? { displayName } : undefined)),
    isLoading,
    error,
  }
}

export function useMagicLink(): {
  send: (email: string) => Promise<void>
  verify: (token: string) => Promise<AuthResult>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    send: async (email: string) => run(() => client.signInWithMagicLink(email)),
    verify: async (token: string) => run(() => client.verifyMagicLink(token)),
    isLoading,
    error,
  }
}

export function useMFA(): {
  setup: () => Promise<TOTPSetupResult>
  enable: (code: string) => Promise<void>
  disable: (code: string) => Promise<void>
  verify: (mfaToken: string, code: string) => Promise<AuthResult>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    setup: async () => run(() => client.setupTOTP()),
    enable: async (code: string) => run(() => client.enableTOTP(code)),
    disable: async (code: string) => run(() => client.disableTOTP(code)),
    verify: async (mfaToken: string, code: string) => run(() => client.verifyMFA(mfaToken, code)),
    isLoading,
    error,
  }
}

export function usePasskeys(): {
  register: (displayName?: string) => Promise<void>
  authenticate: () => Promise<AuthResult>
  remove: (passkeyId: string) => Promise<void>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<AuthKitError | null>>
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    register: async (displayName?: string) => run(() => client.registerPasskey(displayName)),
    authenticate: async () => run(() => client.authenticateWithPasskey()),
    remove: async (passkeyId: string) => run(() => client.removePasskey(passkeyId)),
    isLoading,
    error,
  }
}
