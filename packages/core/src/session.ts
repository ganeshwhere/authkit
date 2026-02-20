import type { AuthState, Session, User } from './types'

type AuthStateListener = (state: AuthState) => void

function buildAuthState(
  user: User | null,
  session: Session | null,
  accessToken: string | null,
): AuthState {
  return {
    user,
    session,
    accessToken,
    isSignedIn: Boolean(user && accessToken),
  }
}

export class AuthStateStore {
  private user: User | null = null
  private session: Session | null = null
  private accessToken: string | null = null
  private listeners = new Set<AuthStateListener>()

  getState(): AuthState {
    return buildAuthState(this.user, this.session, this.accessToken)
  }

  setAuthenticated(params: {
    user: User
    accessToken: string
    session?: Session
  }): void {
    this.user = params.user
    this.accessToken = params.accessToken
    this.session = params.session ?? this.session
    this.notify()
  }

  setSession(session: Session | null): void {
    this.session = session
    this.notify()
  }

  setUser(user: User | null): void {
    this.user = user
    this.notify()
  }

  setAccessToken(accessToken: string | null): void {
    this.accessToken = accessToken
    this.notify()
  }

  clear(): void {
    this.user = null
    this.session = null
    this.accessToken = null
    this.notify()
  }

  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener)

    listener(this.getState())

    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const snapshot = this.getState()

    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }
}
