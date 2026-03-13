import {
  AuthKitError,
  toAuthKitError,
} from './errors'
import { AuthStateStore } from './session'
import { MemoryTokenStorage } from './tokens'
import type {
  APIResponseEnvelope,
  AuthKitConfig,
  AuthResult,
  AuthState,
  MFARequiredResult,
  OAuthOptions,
  OAuthProvider,
  Session,
  SignInResult,
  SignUpOptions,
  SignUpResult,
  TOTPSetupResult,
  TokenStorage,
  UpdateUserData,
  User,
  UserProfileResult,
} from './types'

type RequestOptions = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: Record<string, unknown>
  query?: Record<string, string | undefined>
  requiresAuth?: boolean
  headers?: Record<string, string>
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(path, `${baseUrl}/`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value.length > 0) {
        url.searchParams.set(key, value)
      }
    }
  }

  return url.toString()
}

function assertEnvelope<T>(value: unknown): APIResponseEnvelope<T> {
  if (!value || typeof value !== 'object') {
    throw new AuthKitError({
      code: 'INVALID_RESPONSE',
      message: 'Invalid response received from AuthKit server',
      status: 502,
    })
  }

  const parsed = value as APIResponseEnvelope<T>

  if (!('data' in parsed) || !('error' in parsed)) {
    throw new AuthKitError({
      code: 'INVALID_RESPONSE',
      message: 'Invalid response envelope received from AuthKit server',
      status: 502,
    })
  }

  return parsed
}

export class AuthKitClient {
  private readonly config: Required<Pick<AuthKitConfig, 'projectId' | 'baseUrl'>> &
    Omit<AuthKitConfig, 'projectId' | 'baseUrl'>
  private readonly fetcher: typeof fetch
  private readonly tokenStorage: TokenStorage
  private readonly authStateStore = new AuthStateStore()

  constructor(config: AuthKitConfig) {
    if (!config.projectId || config.projectId.trim().length === 0) {
      throw new AuthKitError({
        code: 'INVALID_CONFIG',
        message: 'projectId is required',
      })
    }

    const resolvedFetch = config.fetch ?? globalThis.fetch

    if (!resolvedFetch) {
      throw new AuthKitError({
        code: 'MISSING_FETCH',
        message: 'No fetch implementation available. Pass config.fetch when initializing AuthKitClient.',
      })
    }

    this.fetcher = resolvedFetch
    this.tokenStorage = config.tokenStorage ?? new MemoryTokenStorage()
    this.config = {
      ...config,
      projectId: config.projectId,
      baseUrl: normalizeBaseUrl(config.baseUrl ?? 'https://api.authkit.dev'),
    }

    this.authStateStore.setAccessToken(this.tokenStorage.getAccessToken())
  }

  getUser(): User | null {
    return this.authStateStore.getState().user
  }

  getSession(): Session | null {
    return this.authStateStore.getState().session
  }

  getAuthState(): AuthState {
    return this.authStateStore.getState()
  }

  onAuthStateChange(callback: (state: AuthState) => void): () => void {
    return this.authStateStore.subscribe(callback)
  }

  private requireAccessToken(): string {
    const accessToken = this.tokenStorage.getAccessToken()

    if (!accessToken) {
      throw new AuthKitError({
        code: 'UNAUTHORIZED',
        message: 'No active access token. Sign in first.',
        status: 401,
      })
    }

    return accessToken
  }

  private updateAuthState(result: {
    user: User
    accessToken: string
    session?: Session
  }): void {
    this.tokenStorage.setAccessToken(result.accessToken)
    const authState: {
      user: User
      accessToken: string
      session?: Session
    } = {
      user: result.user,
      accessToken: result.accessToken,
    }

    if (result.session) {
      authState.session = result.session
    }

    this.authStateStore.setAuthenticated(authState)
  }

  private clearAuthState(): void {
    this.tokenStorage.clearAccessToken()
    this.authStateStore.clear()
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      'x-authkit-project-id': this.config.projectId,
      ...this.config.defaultHeaders,
      ...options.headers,
    }

    if (options.requiresAuth) {
      headers.authorization = `Bearer ${this.requireAccessToken()}`
    }

    if (options.body) {
      headers['content-type'] = 'application/json'
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers,
      credentials: 'include',
    }

    if (options.body) {
      requestInit.body = JSON.stringify(options.body)
    }

    const response = await this.fetcher(
      buildUrl(this.config.baseUrl, options.path, options.query),
      requestInit,
    )

    const text = await response.text()
    let payload: unknown = { data: null, error: null }

    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        throw new AuthKitError({
          code: 'INVALID_RESPONSE',
          message: 'Failed to parse JSON response from AuthKit server',
          status: response.status,
        })
      }
    }

    const envelope = assertEnvelope<T>(payload)

    if (envelope.error) {
      throw toAuthKitError(envelope.error, response.status)
    }

    if (!response.ok) {
      throw new AuthKitError({
        code: 'REQUEST_FAILED',
        message: `AuthKit request failed with status ${response.status}`,
        status: response.status,
      })
    }

    if (envelope.data === null) {
      throw new AuthKitError({
        code: 'INVALID_RESPONSE',
        message: 'AuthKit response data was null',
        status: response.status,
      })
    }

    return envelope.data
  }

  async signUp(email: string, password: string, options: SignUpOptions = {}): Promise<SignUpResult> {
    const result = await this.request<SignUpResult>({
      method: 'POST',
      path: '/v1/auth/signup',
      body: {
        email,
        password,
        displayName: options.displayName,
      },
    })

    this.updateAuthState(result)
    return result
  }

  async signIn(email: string, password: string): Promise<SignInResult | MFARequiredResult> {
    const result = await this.request<SignInResult | MFARequiredResult>({
      method: 'POST',
      path: '/v1/auth/signin',
      body: {
        email,
        password,
      },
    })

    if ('mfaRequired' in result) {
      return result
    }

    this.updateAuthState(result)
    return result
  }

  async signInWithMagicLink(email: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/magic-link/send',
      body: {
        email,
      },
    })
  }

  async verifyMagicLink(token: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>({
      method: 'GET',
      path: '/v1/auth/magic-link/verify',
      query: {
        token,
      },
    })

    this.updateAuthState(result)
    return result
  }

  getOAuthRedirectUrl(provider: OAuthProvider, options: OAuthOptions = {}): string {
    return buildUrl(this.config.baseUrl, `/v1/auth/oauth/${provider}`, {
      redirectUrl: options.redirectUrl,
      state: options.state,
    })
  }

  async signInWithOAuth(provider: OAuthProvider, options: OAuthOptions = {}): Promise<void> {
    const url = this.getOAuthRedirectUrl(provider, options)
    const runtime = globalThis as unknown as { location?: { assign: (url: string) => void } }

    if (!runtime.location?.assign) {
      throw new AuthKitError({
        code: 'OAUTH_REDIRECT_REQUIRED',
        message: `Open this URL in a browser to continue OAuth sign-in: ${url}`,
      })
    }

    runtime.location.assign(url)
  }

  async handleOAuthCallback(url: string): Promise<AuthResult> {
    const parsed = new URL(url)
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('accessToken')

    if (!accessToken) {
      throw new AuthKitError({
        code: 'INVALID_OAUTH_CALLBACK',
        message: 'OAuth callback does not contain accessToken in URL fragment',
      })
    }

    this.tokenStorage.setAccessToken(accessToken)
    this.authStateStore.setAccessToken(accessToken)

    const profile = await this.request<UserProfileResult>({
      method: 'GET',
      path: '/v1/user/me',
      requiresAuth: true,
    })

    const session = profile.sessions[0]

    if (!session) {
      throw new AuthKitError({
        code: 'INVALID_OAUTH_CALLBACK',
        message: 'OAuth callback completed without an active session',
      })
    }

    this.authStateStore.setUser(profile.user)
    this.authStateStore.setSession(session)

    return {
      user: profile.user,
      accessToken,
      session,
    }
  }

  async signOut(): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/signout',
      requiresAuth: true,
    })

    this.clearAuthState()
  }

  async refreshSession(): Promise<{ accessToken: string; session: Session }> {
    const result = await this.request<{ accessToken: string; session: Session }>({
      method: 'POST',
      path: '/v1/auth/refresh',
    })

    this.tokenStorage.setAccessToken(result.accessToken)
    this.authStateStore.setAccessToken(result.accessToken)
    this.authStateStore.setSession(result.session)

    return result
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/forgot-password',
      body: {
        email,
      },
    })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/reset-password',
      body: {
        token,
        newPassword,
      },
    })
  }

  async verifyEmail(token: string): Promise<User> {
    const result = await this.request<{ user: User }>({
      method: 'POST',
      path: '/v1/auth/verify-email',
      body: {
        token,
      },
    })

    this.authStateStore.setUser(result.user)
    return result.user
  }

  async verifyMFA(mfaToken: string, code: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>({
      method: 'POST',
      path: '/v1/auth/mfa/verify',
      body: {
        mfaToken,
        code,
      },
    })

    this.updateAuthState(result)
    return result
  }

  async getUserProfile(): Promise<UserProfileResult> {
    const profile = await this.request<UserProfileResult>({
      method: 'GET',
      path: '/v1/user/me',
      requiresAuth: true,
    })

    this.authStateStore.setUser(profile.user)
    this.authStateStore.setSession(profile.sessions[0] ?? this.getSession())

    return profile
  }

  async updateUser(data: UpdateUserData): Promise<User> {
    const result = await this.request<{ user: User }>({
      method: 'PATCH',
      path: '/v1/user/me',
      requiresAuth: true,
      body: data,
    })

    this.authStateStore.setUser(result.user)
    return result.user
  }

  async deleteAccount(): Promise<void> {
    await this.request<{ success: true }>({
      method: 'DELETE',
      path: '/v1/user/me',
      requiresAuth: true,
      body: {
        confirmation: 'DELETE',
      },
    })

    this.clearAuthState()
  }

  async getSessions(): Promise<Session[]> {
    const result = await this.request<{ sessions: Session[] }>({
      method: 'GET',
      path: '/v1/user/sessions',
      requiresAuth: true,
    })

    return result.sessions
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'DELETE',
      path: `/v1/user/sessions/${sessionId}`,
      requiresAuth: true,
    })
  }

  async revokeAllSessions(): Promise<void> {
    await this.request<{ success: true }>({
      method: 'DELETE',
      path: '/v1/user/sessions',
      requiresAuth: true,
    })
  }

  async setupTOTP(): Promise<TOTPSetupResult> {
    return this.request<TOTPSetupResult>({
      method: 'POST',
      path: '/v1/auth/mfa/totp/setup',
      requiresAuth: true,
    })
  }

  async enableTOTP(code: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/mfa/totp/enable',
      requiresAuth: true,
      body: { code },
    })
  }

  async disableTOTP(code: string): Promise<void> {
    await this.request<{ success: true }>({
      method: 'POST',
      path: '/v1/auth/mfa/totp/disable',
      requiresAuth: true,
      body: { code },
    })
  }

  async getBackupCodes(): Promise<string[]> {
    const result = await this.request<{ codes: string[] }>({
      method: 'GET',
      path: '/v1/auth/mfa/backup-codes',
      requiresAuth: true,
    })

    return result.codes
  }

  async regenerateBackupCodes(code: string): Promise<string[]> {
    const result = await this.request<{ codes: string[] }>({
      method: 'POST',
      path: '/v1/auth/mfa/backup-codes/regenerate',
      requiresAuth: true,
      body: { code },
    })

    return result.codes
  }

  async registerPasskey(_displayName?: string): Promise<void> {
    void _displayName
    throw new AuthKitError({
      code: 'PASSKEY_BROWSER_FLOW_REQUIRED',
      message: 'Use framework-specific helpers for browser passkey registration flow.',
    })
  }

  async authenticateWithPasskey(): Promise<AuthResult> {
    throw new AuthKitError({
      code: 'PASSKEY_BROWSER_FLOW_REQUIRED',
      message: 'Use framework-specific helpers for browser passkey authentication flow.',
    })
  }

  async removePasskey(passkeyId: string): Promise<void> {
    void passkeyId
    throw new AuthKitError({
      code: 'PASSKEY_API_UNAVAILABLE',
      message: 'Passkey removal endpoint is not yet available in the core client.',
    })
  }

  async getAccessToken(): Promise<string | null> {
    const existingToken = this.tokenStorage.getAccessToken()

    if (existingToken) {
      this.authStateStore.setAccessToken(existingToken)
      return existingToken
    }

    try {
      const refreshed = await this.refreshSession()
      return refreshed.accessToken
    } catch {
      return null
    }
  }
}
