import {
  AuthKitClient,
  type AuthKitConfig,
  type AuthState,
} from '@authkit/core'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { normalizeAuthKitError } from './utils'

type AuthKitContextValue = {
  client: AuthKitClient
  state: AuthState
  isLoaded: boolean
}

const AuthKitContext = createContext<AuthKitContextValue | null>(null)

export type AuthKitProviderProps = {
  config: AuthKitConfig
  client?: AuthKitClient
  children: ReactNode
}

export function AuthKitProvider(props: AuthKitProviderProps): JSX.Element {
  const clientRef = useRef<AuthKitClient | null>(props.client ?? null)

  if (!clientRef.current) {
    clientRef.current = new AuthKitClient(props.config)
  }

  const client = clientRef.current
  const [state, setState] = useState<AuthState>(() => client.getAuthState())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const unsubscribe = client.onAuthStateChange((next) => {
      setState(next)
    })

    let active = true

    ;(async () => {
      try {
        const accessToken = await client.getAccessToken()

        if (accessToken) {
          await client.getUserProfile()
        }
      } catch (error) {
        normalizeAuthKitError(error)
      } finally {
        if (active) {
          setIsLoaded(true)
        }
      }
    })()

    return () => {
      active = false
      unsubscribe()
    }
  }, [client])

  const value = useMemo<AuthKitContextValue>(() => ({
    client,
    state,
    isLoaded,
  }), [client, state, isLoaded])

  return <AuthKitContext.Provider value={value}>{props.children}</AuthKitContext.Provider>
}

export function useAuthKitContext(): AuthKitContextValue {
  const context = useContext(AuthKitContext)

  if (!context) {
    throw new Error('useAuthKitContext must be used inside <AuthKitProvider>')
  }

  return context
}
