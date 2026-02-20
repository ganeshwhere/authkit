import {
  type AuthKitConfig,
  type AuthState,
  AuthKitClient,
} from '@authkit/core'
import {
  type App,
  type InjectionKey,
  type Plugin,
  type Ref,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  ref,
} from 'vue'

import { normalizeAuthKitError } from './utils'

export type AuthKitContext = {
  client: AuthKitClient
  state: Readonly<Ref<AuthState>>
  isLoaded: Readonly<Ref<boolean>>
  initialize: () => Promise<void>
  dispose: () => void
}

export type AuthKitProviderOptions = {
  config?: AuthKitConfig
  client?: AuthKitClient
}

export const AUTHKIT_INJECTION_KEY: InjectionKey<AuthKitContext> = Symbol('authkit')

function resolveClient(options: AuthKitProviderOptions): AuthKitClient {
  if (options.client) {
    return options.client
  }

  if (!options.config) {
    throw new Error('AuthKit requires either a client instance or config to initialize')
  }

  return new AuthKitClient(options.config)
}

export function createAuthKit(options: AuthKitProviderOptions): AuthKitContext {
  const client = resolveClient(options)
  const state = ref<AuthState>(client.getAuthState())
  const isLoaded = ref(false)

  let unsubscribe: (() => void) | null = null
  let initializingPromise: Promise<void> | null = null
  let disposed = false

  async function initialize(): Promise<void> {
    if (initializingPromise) {
      return initializingPromise
    }

    initializingPromise = (async () => {
      if (!unsubscribe) {
        unsubscribe = client.onAuthStateChange((next) => {
          state.value = next
        })
      }

      try {
        const accessToken = await client.getAccessToken()

        if (accessToken) {
          await client.getUserProfile()
        }
      } catch (error) {
        normalizeAuthKitError(error)
      } finally {
        if (!disposed) {
          isLoaded.value = true
        }
      }
    })()

    await initializingPromise
  }

  function dispose(): void {
    disposed = true
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  return {
    client,
    state: readonly(state),
    isLoaded: readonly(isLoaded),
    initialize,
    dispose,
  }
}

export function provideAuthKit(options: AuthKitProviderOptions): AuthKitContext {
  const context = createAuthKit(options)
  provide(AUTHKIT_INJECTION_KEY, context)

  onMounted(() => {
    void context.initialize()
  })

  onBeforeUnmount(() => {
    context.dispose()
  })

  return context
}

export function useAuthKitContext(): AuthKitContext {
  const context = inject(AUTHKIT_INJECTION_KEY, null)

  if (!context) {
    throw new Error('useAuthKitContext must be used after provideAuthKit() or installAuthKit()')
  }

  return context
}

export function createAuthKitPlugin(options: AuthKitProviderOptions): Plugin {
  const context = createAuthKit(options)

  return {
    install(app: App) {
      app.provide(AUTHKIT_INJECTION_KEY, context)
      void context.initialize()

      const appWithUnmount = app as App & {
        onUnmount?: (callback: () => void) => void
      }

      appWithUnmount.onUnmount?.(() => {
        context.dispose()
      })
    },
  }
}
