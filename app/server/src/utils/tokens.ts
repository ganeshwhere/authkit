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

export function setRefreshTokenCookie(
  reply: FastifyReply,
  token: string,
  secure = true,
): void {
  reply.setCookie('refresh_token', token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/v1/auth/refresh',
  })
}

export function clearRefreshTokenCookie(reply: FastifyReply, secure = true): void {
  reply.clearCookie('refresh_token', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/v1/auth/refresh',
  })
}
