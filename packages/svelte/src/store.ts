import {
  AuthKitClient,
  type AuthKitConfig,
  type AuthState,
  type Session,
  type User,
} from '@authkit/core'
import {
  derived,
  readonly,
  writable,
  type Readable,
} from 'svelte/store'

import { normalizeAuthKitError } from './utils'

export type AuthKitStoreOptions = {
  config?: AuthKitConfig
  client?: AuthKitClient
}

export type AuthKitStore = {
  client: AuthKitClient
  state: Readable<AuthState>
  isLoaded: Readable<boolean>
  user: Readable<User | null>
  session: Readable<Session | null>
  isSignedIn: Readable<boolean>
  initialize: () => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
  destroy: () => void
}

function resolveClient(options: AuthKitStoreOptions): AuthKitClient {
  if (options.client) {
    return options.client
  }

  if (!options.config) {
    throw new Error('AuthKit requires either a client instance or config to initialize')
  }

  return new AuthKitClient(options.config)
}

export function createAuthKitStore(options: AuthKitStoreOptions): AuthKitStore {
  const client = resolveClient(options)
  const stateStore = writable<AuthState>(client.getAuthState())
  const isLoadedStore = writable(false)

  let unsubscribe: (() => void) | null = null
  let initPromise: Promise<void> | null = null
  let destroyed = false

  async function initialize(): Promise<void> {
    if (initPromise) {
      return initPromise
    }

    initPromise = (async () => {
      if (!unsubscribe) {
        unsubscribe = client.onAuthStateChange((next) => {
          stateStore.set(next)
        })
      }

      try {
        const token = await client.getAccessToken()

        if (token) {
          await client.getUserProfile()
        }
      } catch (error) {
        normalizeAuthKitError(error)
      } finally {
        if (!destroyed) {
          isLoadedStore.set(true)
        }
      }
    })()

    await initPromise
  }

  async function signOut(): Promise<void> {
    await client.signOut()
  }

  async function getToken(): Promise<string | null> {
    return client.getAccessToken()
  }

  function destroy(): void {
    destroyed = true
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  return {
    client,
    state: readonly(stateStore),
    isLoaded: readonly(isLoadedStore),
    user: derived(stateStore, ($state) => $state.user),
    session: derived(stateStore, ($state) => $state.session),
    isSignedIn: derived(stateStore, ($state) => $state.isSignedIn),
    initialize,
    signOut,
    getToken,
    destroy,
  }
}
