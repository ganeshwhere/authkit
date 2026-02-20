import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import {
  auditLogs,
  oauthAccounts,
  passkeys,
  projects,
  sessions,
  userMfa,
  userPasswords,
  users,
  verificationTokens,
  webhookDeliveries,
  webhookEndpoints,
} from '../src/db/schema'

describe('schema - foundational tables', () => {
  it('includes project user and password tables', () => {
    const projectColumns = getTableColumns(projects)
    const userColumns = getTableColumns(users)
    const passwordColumns = getTableColumns(userPasswords)

    expect(projectColumns.slug).toBeDefined()
    expect(userColumns.projectId).toBeDefined()
    expect(userColumns.deletedAt).toBeDefined()
    expect(passwordColumns.hash).toBeDefined()
  })

  it('includes sessions and verification token columns', () => {
    const sessionColumns = getTableColumns(sessions)
    const tokenColumns = getTableColumns(verificationTokens)

    expect(sessionColumns.tokenHash).toBeDefined()
    expect(sessionColumns.tokenFamily).toBeDefined()
    expect(tokenColumns.type).toBeDefined()
    expect(tokenColumns.usedAt).toBeDefined()
  })

  it('includes oauth mfa and passkey columns', () => {
    const oauthColumns = getTableColumns(oauthAccounts)
    const mfaColumns = getTableColumns(userMfa)
    const passkeyColumns = getTableColumns(passkeys)

    expect(oauthColumns.providerUserId).toBeDefined()
    expect(mfaColumns.backupCodes).toBeDefined()
    expect(passkeyColumns.credentialId).toBeDefined()
    expect(passkeyColumns.counter).toBeDefined()
  })

  it('includes audit and webhook tables', () => {
    const auditColumns = getTableColumns(auditLogs)
    const endpointColumns = getTableColumns(webhookEndpoints)
    const deliveryColumns = getTableColumns(webhookDeliveries)

    expect(auditColumns.event).toBeDefined()
    expect(endpointColumns.events).toBeDefined()
    expect(deliveryColumns.attempt).toBeDefined()
  })
})
