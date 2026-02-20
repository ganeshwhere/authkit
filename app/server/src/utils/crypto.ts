import { createHash, randomBytes } from 'node:crypto'

import argon2 from 'argon2'

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function generateTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
