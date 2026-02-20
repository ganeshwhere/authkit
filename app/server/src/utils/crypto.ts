import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  generateKeyPair as generateKeyPairCallback,
  randomBytes,
  timingSafeEqual,
  type KeyObject,
} from 'node:crypto'
import { promisify } from 'node:util'

import argon2 from 'argon2'
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose'

import type { AccessTokenPayload } from '../types/auth'

const generateKeyPair = promisify(generateKeyPairCallback)

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
}

function keyObjectToPem(key: KeyObject, type: 'private' | 'public'): string {
  if (type === 'private') {
    return key.export({ format: 'pem', type: 'pkcs8' }).toString()
  }

  return key.export({ format: 'pem', type: 'spki' }).toString()
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

export function signHMAC(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expected = signHMAC(data, secret)

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export function encrypt(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes')
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${authTag.toString('base64url')}`
}

export function decrypt(ciphertext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes')
  }

  const [ivBase64, payloadBase64, tagBase64] = ciphertext.split('.')

  if (!ivBase64 || !payloadBase64 || !tagBase64) {
    throw new Error('Invalid ciphertext format')
  }

  const iv = Buffer.from(ivBase64, 'base64url')
  const payload = Buffer.from(payloadBase64, 'base64url')
  const tag = Buffer.from(tagBase64, 'base64url')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()])
  return decrypted.toString('utf8')
}

export async function signAccessToken(
  payload: AccessTokenPayload,
  privateKey: KeyObject,
): Promise<string> {
  const privatePem = keyObjectToPem(privateKey, 'private')
  const key = await importPKCS8(privatePem, 'RS256')

  const { iat, exp, ...claims } = payload

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setIssuer(payload.iss)
    .setSubject(payload.sub)
    .sign(key)
}

export async function verifyAccessToken(
  token: string,
  publicKey: KeyObject,
): Promise<AccessTokenPayload> {
  const publicPem = keyObjectToPem(publicKey, 'public')
  const key = await importSPKI(publicPem, 'RS256')

  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
  })

  return {
    sub: String(payload.sub),
    sid: String(payload.sid),
    pid: String(payload.pid),
    email: String(payload.email),
    emailVerified: Boolean(payload.emailVerified),
    iat: Number(payload.iat),
    exp: Number(payload.exp),
    iss: String(payload.iss),
  }
}

export async function generateRSAKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const { privateKey, publicKey } = await generateKeyPair('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      format: 'pem',
      type: 'spki',
    },
    privateKeyEncoding: {
      format: 'pem',
      type: 'pkcs8',
    },
  })

  return {
    privateKey,
    publicKey,
  }
}
