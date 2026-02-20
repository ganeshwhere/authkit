import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readEnvFile, upsertEnvValues } from './env'

describe('env helpers', () => {
  it('writes and reads env values', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'authkit-env-'))

    await upsertEnvValues(tempDir, {
      FOO: 'bar',
      HELLO: 'world',
    })

    const env = await readEnvFile(tempDir)
    expect(env.get('FOO')).toBe('bar')
    expect(env.get('HELLO')).toBe('world')
  })

  it('updates existing values', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'authkit-env-'))
    await fs.writeFile(path.join(tempDir, '.env'), 'FOO=old\n', 'utf8')

    await upsertEnvValues(tempDir, {
      FOO: 'new',
      BAR: 'added',
    })

    const env = await readEnvFile(tempDir)
    expect(env.get('FOO')).toBe('new')
    expect(env.get('BAR')).toBe('added')
  })
})
