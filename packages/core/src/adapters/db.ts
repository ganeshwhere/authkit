export interface User {
  id: string
  projectId: string
  email: string
  emailVerified: boolean
  displayName: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown>
  bannedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  projectId: string
  tokenHash: string
  tokenFamily: string
  ipAddress: string | null
  userAgent: string | null
  lastActiveAt: Date
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface VerificationToken {
  id: string
  projectId: string
  userId: string | null
  email: string
  tokenHash: string
  type: 'magic_link' | 'email_verify' | 'password_reset'
  usedAt: Date | null
  expiresAt: Date
  createdAt: Date
}

export interface OAuthAccount {
  id: string
  userId: string
  projectId: string
  provider: string
  providerUserId: string
  rawProfile: Record<string, unknown>
  createdAt: Date
}

export interface AuditLog {
  id: string
  projectId: string
  userId: string | null
  event: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface WebhookEndpoint {
  id: string
  projectId: string
  url: string
  secret: string
  events: string[]
  enabled: boolean
  createdAt: Date
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  event: string
  payload: Record<string, unknown>
  responseStatus: number | null
  responseBody: string | null
  attempt: number
  deliveredAt: Date | null
  failedAt: Date | null
  createdAt: Date
}

export interface DatabaseAdapter {
  createUser(
    projectId: string,
    data: {
      email: string
      emailVerified?: boolean
      displayName?: string
      avatarUrl?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<User>

  getUserById(projectId: string, id: string): Promise<User | null>
  getUserByEmail(projectId: string, email: string): Promise<User | null>

  updateUser(
    projectId: string,
    id: string,
    data: Partial<{
      email: string
      emailVerified: boolean
      displayName: string
      avatarUrl: string
      metadata: Record<string, unknown>
      bannedAt: Date | null
    }>,
  ): Promise<User>

  deleteUser(projectId: string, id: string): Promise<void>

  listUsers(
    projectId: string,
    options: {
      limit: number
      offset: number
      search?: string
    },
  ): Promise<{ users: User[]; total: number }>

  setPassword(userId: string, hash: string): Promise<void>
  getPasswordHash(userId: string): Promise<string | null>

  createSession(data: {
    userId: string
    projectId: string
    tokenHash: string
    tokenFamily: string
    ipAddress?: string
    userAgent?: string
    expiresAt: Date
  }): Promise<Session>

  getSessionByTokenHash(tokenHash: string): Promise<Session | null>
  getSessionsByUserId(userId: string): Promise<Session[]>
  revokeSession(tokenHash: string): Promise<void>
  revokeAllUserSessions(userId: string): Promise<void>
  revokeSessionFamily(tokenFamily: string): Promise<void>
  cleanExpiredSessions(): Promise<void>

  createVerificationToken(data: {
    projectId: string
    userId?: string
    email: string
    tokenHash: string
    type: VerificationToken['type']
    expiresAt: Date
  }): Promise<VerificationToken>

  getVerificationToken(
    tokenHash: string,
    type: VerificationToken['type'],
  ): Promise<VerificationToken | null>
  markTokenUsed(tokenHash: string): Promise<void>
  deleteExpiredTokens(): Promise<void>

  createOAuthAccount(data: {
    userId: string
    projectId: string
    provider: string
    providerUserId: string
    rawProfile: Record<string, unknown>
  }): Promise<OAuthAccount>

  getOAuthAccount(
    projectId: string,
    provider: string,
    providerUserId: string,
  ): Promise<OAuthAccount | null>
  getOAuthAccountsByUserId(userId: string): Promise<OAuthAccount[]>
  deleteOAuthAccount(userId: string, provider: string): Promise<void>

  createMFASecret(userId: string, encryptedSecret: string, hashedBackupCodes: string[]): Promise<void>
  getMFA(userId: string): Promise<{ encryptedSecret: string; hashedBackupCodes: string[] } | null>
  updateBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<void>
  deleteMFA(userId: string): Promise<void>

  createPasskey(data: {
    userId: string
    projectId: string
    credentialId: string
    publicKey: string
    counter: number
    deviceType?: string
    transports?: string[]
    backedUp?: boolean
    displayName?: string
  }): Promise<void>

  getPasskeysByUserId(userId: string): Promise<
    Array<{
      id: string
      credentialId: string
      publicKey: string
      counter: number
      transports: string[]
      displayName: string | null
    }>
  >

  updatePasskeyCounter(credentialId: string, counter: number): Promise<void>
  deletePasskey(id: string, userId: string): Promise<void>

  createAuditLog(data: {
    projectId: string
    userId?: string
    event: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }): Promise<void>

  getAuditLogs(
    projectId: string,
    options: {
      userId?: string
      limit: number
      offset: number
      event?: string
    },
  ): Promise<{ logs: AuditLog[]; total: number }>

  createWebhookEndpoint(data: {
    projectId: string
    url: string
    secret: string
    events: string[]
    enabled?: boolean
  }): Promise<WebhookEndpoint>

  listWebhookEndpoints(projectId: string): Promise<WebhookEndpoint[]>

  updateWebhookEndpoint(
    projectId: string,
    id: string,
    data: Partial<{
      url: string
      secret: string
      events: string[]
      enabled: boolean
    }>,
  ): Promise<WebhookEndpoint>

  deleteWebhookEndpoint(projectId: string, id: string): Promise<void>

  createWebhookDelivery(data: {
    endpointId: string
    event: string
    payload: Record<string, unknown>
    attempt?: number
  }): Promise<WebhookDelivery>

  markWebhookDeliveryResult(data: {
    id: string
    responseStatus: number
    responseBody?: string
    delivered: boolean
  }): Promise<void>

  getWebhookDeliveries(
    endpointId: string,
    options: {
      limit: number
      offset: number
    },
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }>
}
