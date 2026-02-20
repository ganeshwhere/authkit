export type OAuthProvider = 'google' | 'github' | 'discord'

export type APIErrorShape = {
  code: string
  message: string
  details: Record<string, unknown>
}

export type APIResponseEnvelope<T> = {
  data: T | null
  error: APIErrorShape | null
}

export type User = {
  id: string
  projectId: string
  email: string
  emailVerified: boolean
  displayName: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown>
  bannedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Session = {
  id: string
  userId: string
  projectId: string
  tokenHash: string
  tokenFamily: string
  ipAddress: string | null
  userAgent: string | null
  lastActiveAt: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
}

export type OAuthAccount = {
  id: string
  userId: string
  projectId: string
  provider: string
  providerUserId: string
  rawProfile: Record<string, unknown>
  createdAt: string
}

export type PasskeyInfo = {
  id: string
  credentialId: string
  publicKey: string
  counter: number
  transports: string[]
  displayName: string | null
}

export type SignUpOptions = {
  displayName?: string
}

export type SignUpResult = {
  user: User
  accessToken: string
  session: Session
}

export type SignInResult = {
  user: User
  accessToken: string
  session: Session
}

export type MFARequiredResult = {
  mfaRequired: true
  mfaToken: string
}

export type AuthResult = SignUpResult

export type TOTPSetupResult = {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export type UserProfileResult = {
  user: User
  linkedAccounts: OAuthAccount[]
  mfaEnabled: boolean
  passkeys: PasskeyInfo[]
  sessions: Session[]
}

export type UpdateUserData = {
  displayName?: string
  avatarUrl?: string
  metadata?: Record<string, unknown>
}

export type AuthState = {
  user: User | null
  session: Session | null
  accessToken: string | null
  isSignedIn: boolean
}

export type OAuthOptions = {
  redirectUrl?: string
  state?: string
}

export type AuthKitConfig = {
  projectId: string
  publicKey?: string
  secretKey?: string
  baseUrl?: string
  fetch?: typeof fetch
  defaultHeaders?: Record<string, string>
}
