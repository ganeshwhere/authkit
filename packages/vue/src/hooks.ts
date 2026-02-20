import type {
  UpdateUserData,
  User,
} from '@authkit/core'
import {
  computed,
  type ComputedRef,
} from 'vue'

import { useAuthKitContext } from './provider'

export function useAuthKit(): {
  client: ReturnType<typeof useAuthKitContext>['client']
} {
  const { client } = useAuthKitContext()

  return {
    client,
  }
}

export function useAuth(): {
  user: ComputedRef<User | null>
  session: ComputedRef<ReturnType<typeof useAuthKitContext>['state']['value']['session']>
  isLoaded: ComputedRef<boolean>
  isSignedIn: ComputedRef<boolean>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
} {
  const { client, state, isLoaded } = useAuthKitContext()

  return {
    user: computed(() => state.value.user),
    session: computed(() => state.value.session),
    isLoaded: computed(() => isLoaded.value),
    isSignedIn: computed(() => state.value.isSignedIn),
    signOut: async () => client.signOut(),
    getToken: async () => client.getAccessToken(),
  }
}

export function useUser(): {
  user: ComputedRef<User | null>
  isLoaded: ComputedRef<boolean>
  update: (data: UpdateUserData) => Promise<User>
} {
  const { client, state, isLoaded } = useAuthKitContext()

  return {
    user: computed(() => state.value.user),
    isLoaded: computed(() => isLoaded.value),
    update: async (data: UpdateUserData) => client.updateUser(data),
  }
}

export function useSession(): {
  session: ComputedRef<ReturnType<typeof useAuthKitContext>['state']['value']['session']>
  isLoaded: ComputedRef<boolean>
} {
  const { state, isLoaded } = useAuthKitContext()

  return {
    session: computed(() => state.value.session),
    isLoaded: computed(() => isLoaded.value),
  }
}
