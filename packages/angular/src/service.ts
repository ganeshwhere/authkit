import {
  Injectable,
  InjectionToken,
  inject,
} from '@angular/core'
import {
  AuthKitClient,
  type AuthKitConfig,
  type AuthState,
} from '@authkit/core'
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  type Observable,
} from 'rxjs'

export const AUTHKIT_CLIENT = new InjectionToken<AuthKitClient>('AUTHKIT_CLIENT')

export function createAuthKitClient(config: AuthKitConfig): AuthKitClient {
  return new AuthKitClient(config)
}

export function resolveAuthKitClient(): AuthKitClient {
  return inject(AUTHKIT_CLIENT)
}

@Injectable({ providedIn: 'root' })
export class AuthKitService {
  private readonly client: AuthKitClient
  private readonly authStateSubject: BehaviorSubject<AuthState>
  private readonly unsubscribe: () => void

  constructor() {
    this.client = resolveAuthKitClient()
    this.authStateSubject = new BehaviorSubject<AuthState>(this.client.getAuthState())
    this.unsubscribe = this.client.onAuthStateChange((state) => {
      this.authStateSubject.next(state)
    })
  }

  get authState$(): Observable<AuthState> {
    return this.authStateSubject.asObservable()
  }

  get user$(): Observable<AuthState['user']> {
    return this.authState$.pipe(
      map((state) => state.user),
      distinctUntilChanged(),
    )
  }

  get isSignedIn$(): Observable<boolean> {
    return this.authState$.pipe(
      map((state) => state.isSignedIn),
      distinctUntilChanged(),
    )
  }

  async initialize(): Promise<void> {
    const token = await this.client.getAccessToken()

    if (token) {
      await this.client.getUserProfile()
    }
  }

  getClient(): AuthKitClient {
    return this.client
  }

  async getToken(): Promise<string | null> {
    return this.client.getAccessToken()
  }

  async signOut(): Promise<void> {
    await this.client.signOut()
  }

  destroy(): void {
    this.unsubscribe()
  }
}
