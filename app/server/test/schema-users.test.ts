import { getTableColumns } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { projects, sessions, userPasswords, users, verificationTokens } from '../src/db/schema'

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
})
