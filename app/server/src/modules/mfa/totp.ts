import { randomBytes, timingSafeEqual } from 'node:crypto'

import { authenticator } from 'otplib'

import { config } from '../../config'
import { decrypt, encrypt, generateTokenHash } from '../../utils/crypto'

const TOTP_ISSUER = 'AuthKit'

authenticator.options = {
  step: 30,
  window: 1,
}

function encryptionKeyBuffer(): Buffer {
  return Buffer.from(config.encryptionKey, 'hex')
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').replace(/-/g, '').trim().toUpperCase()
}

function timingSafeHashMatch(leftHex: string, rightHex: string): boolean {
  try {
    const left = Buffer.from(leftHex, 'hex')
    const right = Buffer.from(rightHex, 'hex')

    if (left.length !== right.length || left.length === 0) {
      return false
    }

    return timingSafeEqual(left, right)
  } catch {
    return false
  }
}

export function createTotpSetup(email: string): { secret: string; qrCodeUrl: string } {
  const secret = authenticator.generateSecret()
  const qrCodeUrl = authenticator.keyuri(email, TOTP_ISSUER, secret)

  return {
    secret,
    qrCodeUrl,
  }
}

export function encryptTotpSecret(secret: string): string {
  return encrypt(secret, encryptionKeyBuffer())
}

export function decryptTotpSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret, encryptionKeyBuffer())
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.check(code.trim(), secret)
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase()
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) => generateTokenHash(normalizeCode(code)))
}

export function verifyAndConsumeBackupCode(
  code: string,
  hashedBackupCodes: string[],
): { matched: boolean; remaining: string[] } {
  const normalizedHash = generateTokenHash(normalizeCode(code))

  for (let index = 0; index < hashedBackupCodes.length; index += 1) {
    const candidate = hashedBackupCodes[index]

    if (!candidate) {
      continue
    }

    if (timingSafeHashMatch(normalizedHash, candidate)) {
      const remaining = hashedBackupCodes.filter((_, current) => current !== index)

      return {
        matched: true,
        remaining,
      }
    }
  }

  return {
    matched: false,
    remaining: hashedBackupCodes,
  }
}
