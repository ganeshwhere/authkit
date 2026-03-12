import type {
  AuthResult,
  AuthKitError,
  MFARequiredResult,
  OAuthOptions,
  OAuthProvider,
  TOTPSetupResult,
} from '@authkit/core'
import { useCallback, useState } from 'react'

import { useAuthKitContext } from './provider'
import { normalizeAuthKitError } from './utils'

function useAsyncAction(): {
  isLoading: boolean
  error: AuthKitError | null
  run: <T>(action: () => Promise<T>) => Promise<T>
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AuthKitError | null>(null)

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    setError(null)

    try {
      return await action()
    } catch (cause) {
      const normalized = normalizeAuthKitError(cause)
      setError(normalized)
      throw normalized
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, run }
}

export function useSignIn(): {
  signIn: (email: string, password: string) => Promise<AuthResult | MFARequiredResult>
  signInWithOAuth: (provider: OAuthProvider, options?: OAuthOptions) => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  isLoading: boolean
  error: AuthKitError | null
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    signIn: useCallback((email: string, password: string) => run(() => client.signIn(email, password)), [client, run]),
    signInWithOAuth: useCallback((provider: OAuthProvider, options?: OAuthOptions) => run(() => client.signInWithOAuth(provider, options)), [client, run]),
    signInWithMagicLink: useCallback((email: string) => run(() => client.signInWithMagicLink(email)), [client, run]),
    isLoading,
    error,
  }
}

export function useSignUp(): {
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  isLoading: boolean
  error: AuthKitError | null
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    signUp: useCallback(
      (email: string, password: string, displayName?: string) =>
        run(() => client.signUp(email, password, displayName ? { displayName } : undefined)),
      [client, run],
    ),
    isLoading,
    error,
  }
}

export function useMagicLink(): {
  send: (email: string) => Promise<void>
  verify: (token: string) => Promise<AuthResult>
  isLoading: boolean
  error: AuthKitError | null
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    send: useCallback((email: string) => run(() => client.signInWithMagicLink(email)), [client, run]),
    verify: useCallback((token: string) => run(() => client.verifyMagicLink(token)), [client, run]),
    isLoading,
    error,
  }
}

export function useMFA(): {
  setup: () => Promise<TOTPSetupResult>
  enable: (code: string) => Promise<void>
  disable: (code: string) => Promise<void>
  verify: (mfaToken: string, code: string) => Promise<AuthResult>
  isLoading: boolean
  error: AuthKitError | null
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    setup: useCallback(() => run(() => client.setupTOTP()), [client, run]),
    enable: useCallback((code: string) => run(() => client.enableTOTP(code)), [client, run]),
    disable: useCallback((code: string) => run(() => client.disableTOTP(code)), [client, run]),
    verify: useCallback((mfaToken: string, code: string) => run(() => client.verifyMFA(mfaToken, code)), [client, run]),
    isLoading,
    error,
  }
}

export function usePasskeys(): {
  register: (displayName?: string) => Promise<void>
  authenticate: () => Promise<AuthResult>
  remove: (passkeyId: string) => Promise<void>
  isLoading: boolean
  error: AuthKitError | null
} {
  const { client } = useAuthKitContext()
  const { isLoading, error, run } = useAsyncAction()

  return {
    register: useCallback((displayName?: string) => run(() => client.registerPasskey(displayName)), [client, run]),
    authenticate: useCallback(() => run(() => client.authenticateWithPasskey()), [client, run]),
    remove: useCallback((passkeyId: string) => run(() => client.removePasskey(passkeyId)), [client, run]),
    isLoading,
    error,
  }
}
