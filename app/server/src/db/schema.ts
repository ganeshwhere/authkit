import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    secretKey: text('secret_key').notNull(),
    publicKey: text('public_key').notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex('projects_slug_unique').on(table.slug),
  }),
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectEmailUnique: uniqueIndex('users_project_email_unique').on(table.projectId, table.email),
  }),
)

export const userPasswords = pgTable('user_passwords', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  hash: text('hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    rawProfile: jsonb('raw_profile').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerIdentityUnique: uniqueIndex('oauth_accounts_provider_identity_unique').on(
      table.projectId,
      table.provider,
      table.providerUserId,
    ),
    oauthUserIndex: index('idx_oauth_accounts_user').on(table.userId),
  }),
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    tokenFamily: uuid('token_family').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    deviceInfo: jsonb('device_info').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    sessionUserActiveIndex: index('idx_sessions_user_id').on(table.userId).where(sql`revoked_at IS NULL`),
    sessionTokenIndex: index('idx_sessions_token_hash').on(table.tokenHash),
  }),
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    type: text('type').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex('verification_tokens_token_hash_unique').on(table.tokenHash),
    tokenHashIndex: index('idx_verification_tokens_hash').on(table.tokenHash),
  }),
)

export const userMfa = pgTable('user_mfa', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').array().notNull(),
  enabledAt: timestamp('enabled_at', { withTimezone: true }).notNull().defaultNow(),
})

export const passkeys = pgTable(
  'passkeys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    deviceType: text('device_type'),
    transports: text('transports').array(),
    backedUp: boolean('backed_up').notNull().default(false),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => ({
    passkeyIdentityUnique: uniqueIndex('passkeys_project_credential_unique').on(
      table.projectId,
      table.credentialId,
    ),
  }),
)
