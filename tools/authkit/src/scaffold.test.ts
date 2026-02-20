import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildAuthConfigContent,
  buildEnvLocalContent,
  detectProject,
  writeInitFiles,
} from './scaffold'

describe('scaffold helpers', () => {
  it('builds auth config with selected methods', () => {
    const content = buildAuthConfigContent({
      runtime: 'self-hosted',
      database: 'postgresql',
      orm: 'drizzle',
      emailProvider: 'resend',
      authMethods: ['Email + Password', 'Magic Link'],
    })

    expect(content).toContain('password: { enabled: true }')
    expect(content).toContain('magicLink: { enabled: true }')
    expect(content).toContain('passkeys: { enabled: false }')
  })

  it('builds env file with runtime-specific base url', () => {
    const hosted = buildEnvLocalContent({
      runtime: 'hosted',
      database: 'postgresql',
      orm: 'prisma',
      emailProvider: 'resend',
      authMethods: ['Email + Password'],
    })
    const selfHosted = buildEnvLocalContent({
      runtime: 'self-hosted',
      database: 'postgresql',
      orm: 'prisma',
      emailProvider: 'resend',
      authMethods: ['Email + Password'],
    })

    expect(hosted).toContain('AUTHKIT_BASE_URL=https://api.authkit.dev')
    expect(selfHosted).toContain('AUTHKIT_BASE_URL=http://localhost:3001')
  })

  it('detects next framework from package json', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'authkit-cli-'))
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'demo',
          dependencies: {
            next: '^14.2.0',
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    const detected = await detectProject(tempDir)
    expect(detected.framework).toBe('Next.js (App Router)')
    expect(detected.packageName).toBe('demo')
  })

  it('writes init files to expected paths', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'authkit-cli-'))
    const files = await writeInitFiles(tempDir, {
      runtime: 'self-hosted',
      database: 'postgresql',
      orm: 'prisma',
      emailProvider: 'resend',
      authMethods: ['Email + Password'],
    })

    expect(files).toEqual([
      'auth.config.ts',
      'middleware.ts',
      '.env.local',
      path.join('app', 'api', 'auth', '[...authkit]', 'route.ts'),
    ])
  })
})
