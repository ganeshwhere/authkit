import type { UpdateUserData, User } from '@authkit/core'
import { useCallback } from 'react'

import { useAuthKitContext } from './provider'

export function useAuthKit(): { client: ReturnType<typeof useAuthKitContext>['client'] } {
  const { client } = useAuthKitContext()

  return {
    client,
  }
}

export function useAuth(): {
  user: User | null
  session: ReturnType<typeof useAuthKitContext>['state']['session']
  isLoaded: boolean
  isSignedIn: boolean
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
} {
  const { client, state, isLoaded } = useAuthKitContext()

  const signOut = useCallback(async () => {
    await client.signOut()
  }, [client])

  const getToken = useCallback(async () => client.getAccessToken(), [client])

  return {
    user: state.user,
    session: state.session,
    isLoaded,
    isSignedIn: state.isSignedIn,
    signOut,
    getToken,
  }
}

export function useUser(): {
  user: User | null
  isLoaded: boolean
  update: (data: UpdateUserData) => Promise<User>
} {
  const { client, state, isLoaded } = useAuthKitContext()

  const update = useCallback(async (data: UpdateUserData) => client.updateUser(data), [client])

  return {
    user: state.user,
    isLoaded,
    update,
  }
}

export function useSession(): {
  session: ReturnType<typeof useAuthKitContext>['state']['session']
  isLoaded: boolean
} {
  const { state, isLoaded } = useAuthKitContext()

  return {
    session: state.session,
    isLoaded,
  }
}
