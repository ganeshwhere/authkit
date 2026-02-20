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

import type { DatabaseAdapter } from '../../types/adapters'
import type { AuthKitDatabase } from '../../db'
import {
  oauthAccounts,
  passkeys,
  sessions,
  userMfa,
  userPasswords,
  users,
  verificationTokens,
} from '../../db/schema'
import type {
  AuditLog,
  OAuthAccount,
  Session,
  User,
  VerificationToken,
} from '../../../../packages/core/src/adapters/db'

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

    return mapUser(inserted)
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

    return mapUser(row)
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
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      })
      .returning()

    return mapSession(row)
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
        userId: data.userId,
        email: data.email,
        tokenHash: data.tokenHash,
        type: data.type,
        expiresAt: data.expiresAt,
      })
      .returning()

    return mapVerificationToken(row)
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

    return mapOAuthAccount(row)
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
      deviceType: data.deviceType,
      transports: data.transports,
      backedUp: data.backedUp,
      displayName: data.displayName,
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

  async createAuditLog(_data: {
    projectId: string
    userId?: string
    event: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    throw new Error('Not implemented')
  }

  async getAuditLogs(
    _projectId: string,
    _options: {
      userId?: string
      limit: number
      offset: number
      event?: string
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    throw new Error('Not implemented')
  }
}

export function createDrizzleDatabaseAdapter(db: AuthKitDatabase): DatabaseAdapter {
  return new DrizzleDatabaseAdapter(db)
}
