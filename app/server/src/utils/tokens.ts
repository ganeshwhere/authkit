import { randomUUID, type KeyObject } from 'node:crypto'

import type { FastifyReply } from 'fastify'

import type { AccessTokenPayload } from '../types/auth'
import { generateSecureToken, generateTokenHash, signAccessToken } from './crypto'

export type AccessTokenContext = {
  userId: string
  sessionId: string
  projectId: string
  email: string
  emailVerified: boolean
  issuer: string
}

export function createAccessTokenPayload(
  context: AccessTokenContext,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): AccessTokenPayload {
  return {
    sub: context.userId,
    sid: context.sessionId,
    pid: context.projectId,
    email: context.email,
    emailVerified: context.emailVerified,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    iss: context.issuer,
  }
}

export async function issueAccessToken(params: {
  context: AccessTokenContext
  ttlSeconds: number
  privateKey: KeyObject
  nowSeconds?: number
}): Promise<string> {
  const payload = createAccessTokenPayload(params.context, params.ttlSeconds, params.nowSeconds)

  return signAccessToken(payload, params.privateKey)
}

export function issueRefreshToken(bytes = 32): {
  token: string
  tokenHash: string
} {
  const token = generateSecureToken(bytes)

  return {
    token,
    tokenHash: generateTokenHash(token),
  }
}

export function createTokenFamilyId(): string {
  return randomUUID()
}

function serializeCookie(params: {
  name: string
  value: string
  secure: boolean
  maxAgeSeconds?: number
  expires?: Date
}): string {
  const parts = [
    `${params.name}=${params.value}`,
    'Path=/v1/auth/refresh',
    'HttpOnly',
    'SameSite=Strict',
  ]

  if (params.secure) {
    parts.push('Secure')
  }

  if (params.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${params.maxAgeSeconds}`)
  }

  if (params.expires) {
    parts.push(`Expires=${params.expires.toUTCString()}`)
  }

  return parts.join('; ')
}

export function setRefreshTokenCookie(
  reply: FastifyReply,
  token: string,
  secure = true,
): void {
  const cookieReply = reply as FastifyReply & {
    setCookie?: (name: string, value: string, options: Record<string, unknown>) => void
  }

  if (typeof cookieReply.setCookie === 'function') {
    cookieReply.setCookie('refresh_token', token, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/v1/auth/refresh',
    })
    return
  }

  reply.header(
    'set-cookie',
    serializeCookie({
      name: 'refresh_token',
      value: token,
      secure,
    }),
  )
}

export function clearRefreshTokenCookie(reply: FastifyReply, secure = true): void {
  const cookieReply = reply as FastifyReply & {
    clearCookie?: (name: string, options: Record<string, unknown>) => void
  }

  if (typeof cookieReply.clearCookie === 'function') {
    cookieReply.clearCookie('refresh_token', {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/v1/auth/refresh',
    })
    return
  }

  reply.header(
    'set-cookie',
    serializeCookie({
      name: 'refresh_token',
      value: '',
      secure,
      maxAgeSeconds: 0,
      expires: new Date(0),
    }),
  )
}
