import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function readEnvFile(cwd: string, fileName = '.env'): Promise<Map<string, string>> {
  const envPath = path.join(cwd, fileName)
  let raw = ''

  try {
    raw = await fs.readFile(envPath, 'utf8')
  } catch {
    return new Map()
  }

  const parsed = new Map<string, string>()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    parsed.set(key, value)
  }

  return parsed
}

export async function upsertEnvValues(
  cwd: string,
  updates: Record<string, string>,
  fileName = '.env',
): Promise<void> {
  const envPath = path.join(cwd, fileName)
  const current = await readEnvFile(cwd, fileName)

  for (const [key, value] of Object.entries(updates)) {
    current.set(key, value)
  }

  const lines = Array.from(current.entries()).map(([key, value]) => `${key}=${value}`)
  await fs.writeFile(envPath, `${lines.join('\n')}\n`, 'utf8')
}
