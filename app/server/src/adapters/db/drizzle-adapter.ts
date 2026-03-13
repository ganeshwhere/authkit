import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm'

import type { AuthKitDatabase } from '../../db'
import {
  auditLogs,
  oauthAccounts,
  passkeys,
  sessions,
  userMfa,
  userPasswords,
  users,
  verificationTokens,
  webhookDeliveries,
  webhookEndpoints,
} from '../../db/schema'
import type { DatabaseAdapter } from '../../types/adapters'
import type {
  AuditLog,
  OAuthAccount,
  Session,
  User,
  VerificationToken,
  WebhookDelivery,
  WebhookEndpoint,
} from '../../types/adapters'

function assertRow<T>(row: T | undefined, operation: string): T {
  if (!row) {
    throw new Error(`Database operation "${operation}" did not return a row`)
  }

  return row
}

function mapUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    projectId: row.projectId,
    email: row.email,
    emailVerified: row.emailVerified,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    metadata: row.metadata,
    bannedAt: row.bannedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    tokenHash: row.tokenHash,
    tokenFamily: row.tokenFamily,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    lastActiveAt: row.lastActiveAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  }
}

function mapVerificationToken(row: typeof verificationTokens.$inferSelect): VerificationToken {
  const type = row.type as VerificationToken['type']

  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    email: row.email,
    tokenHash: row.tokenHash,
    type,
    usedAt: row.usedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }
}

function mapOAuthAccount(row: typeof oauthAccounts.$inferSelect): OAuthAccount {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    provider: row.provider,
    providerUserId: row.providerUserId,
    rawProfile: row.rawProfile,
    createdAt: row.createdAt,
  }
}

function mapAuditLog(row: typeof auditLogs.$inferSelect): AuditLog {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    event: row.event,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    metadata: row.metadata,
    createdAt: row.createdAt,
  }
}

function mapWebhookEndpoint(row: typeof webhookEndpoints.$inferSelect): WebhookEndpoint {
  return {
    id: row.id,
    projectId: row.projectId,
    url: row.url,
    secret: row.secret,
    events: row.events,
    enabled: row.enabled,
    createdAt: row.createdAt,
  }
}

function mapWebhookDelivery(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
  return {
    id: row.id,
    endpointId: row.endpointId,
    event: row.event,
    payload: row.payload,
    responseStatus: row.responseStatus,
    responseBody: row.responseBody,
    attempt: row.attempt,
    deliveredAt: row.deliveredAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
  }
}

class DrizzleDatabaseAdapter implements DatabaseAdapter {
  constructor(private readonly db: AuthKitDatabase) {}

  async createUser(
    projectId: string,
    data: {
      email: string
      emailVerified?: boolean
      displayName?: string
      avatarUrl?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<User> {
    const [inserted] = await this.db
      .insert(users)
      .values({
        projectId,
        email: data.email,
        emailVerified: data.emailVerified ?? false,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        metadata: data.metadata ?? {},
      })
      .returning()

    return mapUser(assertRow(inserted, 'createUser'))
  }

  async getUserById(projectId: string, id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.projectId, projectId), eq(users.id, id), isNull(users.deletedAt)))
      .limit(1)

    return row ? mapUser(row) : null
  }

  async getUserByEmail(projectId: string, email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.projectId, projectId), eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)

    return row ? mapUser(row) : null
  }

  async updateUser(
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
  ): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set({
        email: data.email,
        emailVerified: data.emailVerified,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        metadata: data.metadata,
        bannedAt: data.bannedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(users.projectId, projectId), eq(users.id, id), isNull(users.deletedAt)))
      .returning()

    return mapUser(assertRow(row, 'updateUser'))
  }

  async deleteUser(projectId: string, id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.projectId, projectId), eq(users.id, id), isNull(users.deletedAt)))
  }

  async listUsers(
    projectId: string,
    options: {
      limit: number
      offset: number
      search?: string
    },
  ): Promise<{ users: User[]; total: number }> {
    const search = options.search?.trim()

    const filter = search
      ? and(
          eq(users.projectId, projectId),
          isNull(users.deletedAt),
          or(ilike(users.email, `%${search}%`), ilike(users.displayName, `%${search}%`)),
        )
      : and(eq(users.projectId, projectId), isNull(users.deletedAt))

    const rows = await this.db
      .select()
      .from(users)
      .where(filter)
      .orderBy(desc(users.createdAt))
      .limit(options.limit)
      .offset(options.offset)

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(filter)

    return {
      users: rows.map(mapUser),
      total: Number(totalRow?.count ?? 0),
    }
  }

  async setPassword(userId: string, hash: string): Promise<void> {
    const existing = await this.getPasswordHash(userId)

    if (existing) {
      await this.db
        .update(userPasswords)
        .set({ hash, updatedAt: new Date() })
        .where(eq(userPasswords.userId, userId))
      return
    }

    await this.db.insert(userPasswords).values({ userId, hash })
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ hash: userPasswords.hash })
      .from(userPasswords)
      .where(eq(userPasswords.userId, userId))
      .limit(1)

    return row?.hash ?? null
  }

  async createSession(data: {
    userId: string
    projectId: string
    tokenHash: string
    tokenFamily: string
    ipAddress?: string
    userAgent?: string
    expiresAt: Date
  }): Promise<Session> {
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId: data.userId,
        projectId: data.projectId,
        tokenHash: data.tokenHash,
        tokenFamily: data.tokenFamily,
        ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
        ...(data.userAgent ? { userAgent: data.userAgent } : {}),
        expiresAt: data.expiresAt,
      })
      .returning()

    return mapSession(assertRow(row, 'createSession'))
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1)

    return row ? mapSession(row) : null
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.createdAt))

    return rows.map(mapSession)
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(), lastActiveAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash))
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(), lastActiveAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
  }

  async revokeSessionFamily(tokenFamily: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(), lastActiveAt: new Date() })
      .where(and(eq(sessions.tokenFamily, tokenFamily), isNull(sessions.revokedAt)))
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  }

  async createVerificationToken(data: {
    projectId: string
    userId?: string
    email: string
    tokenHash: string
    type: VerificationToken['type']
    expiresAt: Date
  }): Promise<VerificationToken> {
    const [row] = await this.db
      .insert(verificationTokens)
      .values({
        projectId: data.projectId,
        ...(data.userId ? { userId: data.userId } : {}),
        email: data.email,
        tokenHash: data.tokenHash,
        type: data.type,
        expiresAt: data.expiresAt,
      })
      .returning()

    return mapVerificationToken(assertRow(row, 'createVerificationToken'))
  }

  async getVerificationToken(
    tokenHash: string,
    type: VerificationToken['type'],
  ): Promise<VerificationToken | null> {
    const [row] = await this.db
      .select()
      .from(verificationTokens)
      .where(and(eq(verificationTokens.tokenHash, tokenHash), eq(verificationTokens.type, type)))
      .limit(1)

    return row ? mapVerificationToken(row) : null
  }

  async markTokenUsed(tokenHash: string): Promise<void> {
    await this.db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.tokenHash, tokenHash))
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.db.delete(verificationTokens).where(lt(verificationTokens.expiresAt, new Date()))
  }

  async createOAuthAccount(data: {
    userId: string
    projectId: string
    provider: string
    providerUserId: string
    rawProfile: Record<string, unknown>
  }): Promise<OAuthAccount> {
    const [row] = await this.db
      .insert(oauthAccounts)
      .values({
        userId: data.userId,
        projectId: data.projectId,
        provider: data.provider,
        providerUserId: data.providerUserId,
        rawProfile: data.rawProfile,
      })
      .returning()

    return mapOAuthAccount(assertRow(row, 'createOAuthAccount'))
  }

  async getOAuthAccount(
    projectId: string,
    provider: string,
    providerUserId: string,
  ): Promise<OAuthAccount | null> {
    const [row] = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.projectId, projectId),
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerUserId, providerUserId),
        ),
      )
      .limit(1)

    return row ? mapOAuthAccount(row) : null
  }

  async getOAuthAccountsByUserId(userId: string): Promise<OAuthAccount[]> {
    const rows = await this.db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .orderBy(desc(oauthAccounts.createdAt))

    return rows.map(mapOAuthAccount)
  }

  async deleteOAuthAccount(userId: string, provider: string): Promise<void> {
    await this.db
      .delete(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
  }

  async createMFASecret(
    userId: string,
    encryptedSecret: string,
    hashedBackupCodes: string[],
  ): Promise<void> {
    await this.db.insert(userMfa).values({
      userId,
      secret: encryptedSecret,
      backupCodes: hashedBackupCodes,
    })
  }

  async getMFA(
    userId: string,
  ): Promise<{ encryptedSecret: string; hashedBackupCodes: string[] } | null> {
    const [row] = await this.db
      .select({ encryptedSecret: userMfa.secret, hashedBackupCodes: userMfa.backupCodes })
      .from(userMfa)
      .where(eq(userMfa.userId, userId))
      .limit(1)

    return row
      ? {
          encryptedSecret: row.encryptedSecret,
          hashedBackupCodes: row.hashedBackupCodes,
        }
      : null
  }

  async updateBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<void> {
    await this.db
      .update(userMfa)
      .set({ backupCodes: hashedBackupCodes })
      .where(eq(userMfa.userId, userId))
  }

  async deleteMFA(userId: string): Promise<void> {
    await this.db.delete(userMfa).where(eq(userMfa.userId, userId))
  }

  async createPasskey(data: {
    userId: string
    projectId: string
    credentialId: string
    publicKey: string
    counter: number
    deviceType?: string
    transports?: string[]
    backedUp?: boolean
    displayName?: string
  }): Promise<void> {
    await this.db.insert(passkeys).values({
      userId: data.userId,
      projectId: data.projectId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      counter: data.counter,
      ...(data.deviceType ? { deviceType: data.deviceType } : {}),
      ...(data.transports ? { transports: data.transports } : {}),
      ...(data.backedUp !== undefined ? { backedUp: data.backedUp } : {}),
      ...(data.displayName ? { displayName: data.displayName } : {}),
    })
  }

  async getPasskeysByUserId(userId: string): Promise<
    Array<{
      id: string
      credentialId: string
      publicKey: string
      counter: number
      transports: string[]
      displayName: string | null
    }>
  > {
    const rows = await this.db
      .select({
        id: passkeys.id,
        credentialId: passkeys.credentialId,
        publicKey: passkeys.publicKey,
        counter: passkeys.counter,
        transports: passkeys.transports,
        displayName: passkeys.displayName,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(desc(passkeys.createdAt))

    return rows.map((row) => ({
      id: row.id,
      credentialId: row.credentialId,
      publicKey: row.publicKey,
      counter: row.counter,
      transports: row.transports ?? [],
      displayName: row.displayName,
    }))
  }

  async updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
    await this.db
      .update(passkeys)
      .set({ counter, lastUsedAt: new Date() })
      .where(eq(passkeys.credentialId, credentialId))
  }

  async deletePasskey(id: string, userId: string): Promise<void> {
    await this.db.delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
  }

  async createAuditLog(data: {
    projectId: string
    userId?: string
    event: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      projectId: data.projectId,
      ...(data.userId ? { userId: data.userId } : {}),
      event: data.event,
      ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
      metadata: data.metadata ?? {},
    })
  }

  async getAuditLogs(
    projectId: string,
    options: {
      userId?: string
      limit: number
      offset: number
      event?: string
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const filters = [eq(auditLogs.projectId, projectId)]

    if (options.userId) {
      filters.push(eq(auditLogs.userId, options.userId))
    }

    if (options.event) {
      filters.push(eq(auditLogs.event, options.event))
    }

    const filter = and(...filters)

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(filter)
      .orderBy(desc(auditLogs.createdAt))
      .limit(options.limit)
      .offset(options.offset)

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(filter)

    return {
      logs: rows.map(mapAuditLog),
      total: Number(totalRow?.count ?? 0),
    }
  }

  async createWebhookEndpoint(data: {
    projectId: string
    url: string
    secret: string
    events: string[]
    enabled?: boolean
  }): Promise<WebhookEndpoint> {
    const [row] = await this.db
      .insert(webhookEndpoints)
      .values({
        projectId: data.projectId,
        url: data.url,
        secret: data.secret,
        events: data.events,
        enabled: data.enabled ?? true,
      })
      .returning()

    return mapWebhookEndpoint(assertRow(row, 'createWebhookEndpoint'))
  }

  async listWebhookEndpoints(projectId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.projectId, projectId))
      .orderBy(desc(webhookEndpoints.createdAt))

    return rows.map(mapWebhookEndpoint)
  }

  async updateWebhookEndpoint(
    projectId: string,
    id: string,
    data: Partial<{
      url: string
      secret: string
      events: string[]
      enabled: boolean
    }>,
  ): Promise<WebhookEndpoint> {
    const [row] = await this.db
      .update(webhookEndpoints)
      .set({
        ...(data.url ? { url: data.url } : {}),
        ...(data.secret ? { secret: data.secret } : {}),
        ...(data.events ? { events: data.events } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      })
      .where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookEndpoints.id, id)))
      .returning()

    return mapWebhookEndpoint(assertRow(row, 'updateWebhookEndpoint'))
  }

  async deleteWebhookEndpoint(projectId: string, id: string): Promise<void> {
    await this.db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.projectId, projectId), eq(webhookEndpoints.id, id)))
  }

  async createWebhookDelivery(data: {
    endpointId: string
    event: string
    payload: Record<string, unknown>
    attempt?: number
  }): Promise<WebhookDelivery> {
    const [row] = await this.db
      .insert(webhookDeliveries)
      .values({
        endpointId: data.endpointId,
        event: data.event,
        payload: data.payload,
        attempt: data.attempt ?? 1,
      })
      .returning()

    return mapWebhookDelivery(assertRow(row, 'createWebhookDelivery'))
  }

  async markWebhookDeliveryResult(data: {
    id: string
    responseStatus: number
    responseBody?: string
    delivered: boolean
  }): Promise<void> {
    await this.db
      .update(webhookDeliveries)
      .set({
        responseStatus: data.responseStatus,
        ...(data.responseBody !== undefined ? { responseBody: data.responseBody } : {}),
        deliveredAt: data.delivered ? new Date() : null,
        failedAt: data.delivered ? null : new Date(),
      })
      .where(eq(webhookDeliveries.id, data.id))
  }

  async getWebhookDeliveries(
    endpointId: string,
    options: {
      limit: number
      offset: number
    },
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const rows = await this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(options.limit)
      .offset(options.offset)

    const [totalRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId))

    return {
      deliveries: rows.map(mapWebhookDelivery),
      total: Number(totalRow?.count ?? 0),
    }
  }
}

export function createDrizzleDatabaseAdapter(db: AuthKitDatabase): DatabaseAdapter {
  return new DrizzleDatabaseAdapter(db)
}
