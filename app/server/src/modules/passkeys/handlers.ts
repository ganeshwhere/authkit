import { createPrivateKey } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { z } from 'zod'

import { config } from '../../config'
import { requireAccessToken } from '../auth/access'
import { requireProjectIdHeader } from '../management/auth'
import { Errors } from '../../utils/errors'
import {
  createTokenFamilyId,
  issueAccessToken,
  issueRefreshToken,
  setRefreshTokenCookie,
} from '../../utils/tokens'

const passkeyRegisterCompleteBodySchema = z.object({
  credential: z.record(z.unknown()),
  displayName: z.string().max(100).optional(),
})

const passkeyAuthenticateBeginBodySchema = z.object({
  email: z.string().email().max(255).optional(),
})

const passkeyAuthenticateCompleteBodySchema = z.object({
  credential: z.record(z.unknown()),
})

type PasskeyChallengeState = {
  type: 'registration' | 'authentication'
  projectId: string
  userId: string | null
  challenge: string
}

type AuthenticatorTransportFuture =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb'

type StoredWebAuthnCredential = {
  id: string
  publicKey: Uint8Array
  counter: number
  transports?: AuthenticatorTransportFuture[]
}

const challengeStateSchema = z.object({
  type: z.enum(['registration', 'authentication']),
  projectId: z.string().min(1),
  userId: z.string().nullable(),
  challenge: z.string().min(1),
})

function rpId(): string {
  return new URL(config.baseUrl).hostname
}

function expectedOrigin(): string {
  return new URL(config.baseUrl).origin
}

function challengeCacheKey(challenge: string): string {
  return `passkey:challenge:${challenge}`
}

async function storeChallenge(
  request: FastifyRequest,
  state: PasskeyChallengeState,
): Promise<void> {
  await request.server.cache.set(challengeCacheKey(state.challenge), JSON.stringify(state), 300)
}

async function consumeChallenge(
  request: FastifyRequest,
  challenge: string,
): Promise<PasskeyChallengeState> {
  const key = challengeCacheKey(challenge)
  const raw = await request.server.cache.get(key)

  if (!raw) {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }

  await request.server.cache.delete(key)

  try {
    const parsed = JSON.parse(raw)
    const validated = challengeStateSchema.parse(parsed)

    return {
      type: validated.type,
      projectId: validated.projectId,
      userId: validated.userId,
      challenge: validated.challenge,
    }
  } catch {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }
}

function encodeToBase64Url(value: Uint8Array | ArrayBuffer | Buffer): string {
  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value)).toString('base64url')
  }

  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

function toAuthenticatorTransports(
  transports: string[] | undefined,
): AuthenticatorTransportFuture[] | undefined {
  if (!transports || transports.length === 0) {
    return undefined
  }

  return transports.filter(
    (transport): transport is AuthenticatorTransportFuture =>
      transport === 'ble' ||
      transport === 'cable' ||
      transport === 'hybrid' ||
      transport === 'internal' ||
      transport === 'nfc' ||
      transport === 'smart-card' ||
      transport === 'usb',
  )
}

function readCredentialId(credential: Record<string, unknown>): string {
  const id = credential.id

  if (typeof id !== 'string' || id.length === 0) {
    throw Errors.PASSKEY_VERIFICATION_FAILED()
  }

  return id
}

function readClientDataChallenge(credential: Record<string, unknown>): string {
  const response = credential.response

  if (!response || typeof response !== 'object') {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }

  const encoded = (response as Record<string, unknown>).clientDataJSON

  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }

  try {
    const decoded = decodeBase64Url(encoded).toString('utf8')
    const parsed = JSON.parse(decoded) as Record<string, unknown>

    if (typeof parsed.challenge !== 'string' || parsed.challenge.length === 0) {
      throw new Error('missing challenge')
    }

    return parsed.challenge
  } catch {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }
}

function readUserHandle(credential: Record<string, unknown>): string | null {
  const response = credential.response

  if (!response || typeof response !== 'object') {
    return null
  }

  const userHandle = (response as Record<string, unknown>).userHandle

  if (typeof userHandle !== 'string' || !userHandle) {
    return null
  }

  try {
    const decoded = decodeBase64Url(userHandle).toString('utf8')
    return decoded || null
  } catch {
    return null
  }
}

export async function passkeyRegisterBeginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)

  const user = await request.server.dbAdapter.getUserById(auth.pid, auth.sub)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  const existingPasskeys = await request.server.dbAdapter.getPasskeysByUserId(user.id)
  const excludeCredentials = existingPasskeys.map((passkey) => {
    const transports = toAuthenticatorTransports(passkey.transports)

    return {
      id: passkey.credentialId,
      ...(transports && transports.length > 0 ? { transports } : {}),
    }
  })

  const options = await generateRegistrationOptions({
    rpName: 'AuthKit',
    rpID: rpId(),
    userName: user.email,
    userDisplayName: user.displayName ?? user.email,
    userID: Buffer.from(user.id, 'utf8'),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials,
  })

  await storeChallenge(request, {
    type: 'registration',
    projectId: auth.pid,
    userId: user.id,
    challenge: options.challenge,
  })

  reply.send({
    data: {
      options,
    },
    error: null,
  })
}

export async function passkeyRegisterCompleteHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const parsed = passkeyRegisterCompleteBodySchema.parse(request.body)

  const challenge = readClientDataChallenge(parsed.credential)
  const challengeState = await consumeChallenge(request, challenge)

  if (
    challengeState.type !== 'registration' ||
    challengeState.userId !== auth.sub ||
    challengeState.projectId !== auth.pid
  ) {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }

  const verification = await verifyRegistrationResponse({
    response: parsed.credential as never,
    expectedChallenge: challengeState.challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpId(),
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw Errors.PASSKEY_VERIFICATION_FAILED()
  }

  const info = verification.registrationInfo as Record<string, unknown>

  const credentialIdRaw = (info.credentialID ?? (info.credential as Record<string, unknown> | undefined)?.id) as
    | Uint8Array
    | ArrayBuffer
    | Buffer
    | undefined
  const publicKeyRaw =
    (info.credentialPublicKey ??
      (info.credential as Record<string, unknown> | undefined)?.publicKey) as
      | Uint8Array
      | ArrayBuffer
      | Buffer
      | undefined
  const counterRaw =
    (info.counter ?? (info.credential as Record<string, unknown> | undefined)?.counter) as
      | number
      | undefined

  if (!credentialIdRaw || !publicKeyRaw) {
    throw Errors.PASSKEY_VERIFICATION_FAILED()
  }

  const credentialId = encodeToBase64Url(credentialIdRaw)
  const publicKey = encodeToBase64Url(publicKeyRaw)

  const response = parsed.credential.response as Record<string, unknown> | undefined
  const transports = Array.isArray(response?.transports)
    ? response.transports.filter((item): item is string => typeof item === 'string')
    : []

  const deviceType =
    typeof info.credentialDeviceType === 'string'
      ? info.credentialDeviceType
      : typeof (info.credential as Record<string, unknown> | undefined)?.deviceType === 'string'
        ? String((info.credential as Record<string, unknown>).deviceType)
        : undefined

  const backedUp =
    typeof info.credentialBackedUp === 'boolean'
      ? info.credentialBackedUp
      : typeof (info.credential as Record<string, unknown> | undefined)?.backedUp === 'boolean'
        ? Boolean((info.credential as Record<string, unknown>).backedUp)
        : false

  try {
    await request.server.dbAdapter.createPasskey({
      userId: auth.sub,
      projectId: auth.pid,
      credentialId,
      publicKey,
      counter: counterRaw ?? 0,
      transports,
      backedUp,
      ...(deviceType ? { deviceType } : {}),
      ...(parsed.displayName ? { displayName: parsed.displayName } : {}),
    })
  } catch {
    throw Errors.PASSKEY_ALREADY_EXISTS()
  }

  if (typeof request.server.emitWebhookEvent === 'function') {
    try {
      await request.server.emitWebhookEvent({
        type: 'passkey.registered',
        projectId: auth.pid,
        data: {
          user: {
            id: auth.sub,
          },
          passkey: {
            credentialId,
            displayName: parsed.displayName ?? null,
          },
        },
      })
    } catch (error) {
      request.log.warn({ error }, 'Failed to enqueue passkey registered webhook event')
    }
  }

  if (typeof request.server.emitAuditEvent === 'function') {
    await request.server.emitAuditEvent({
      projectId: auth.pid,
      userId: auth.sub,
      event: 'passkey.registered',
      request,
      metadata: {
        credentialId,
        displayName: parsed.displayName ?? null,
      },
    })
  }

  reply.send({
    data: {
      passkey: {
        credentialId,
        counter: counterRaw ?? 0,
        transports,
        displayName: parsed.displayName ?? null,
      },
    },
    error: null,
  })
}

export async function passkeyAuthenticateBeginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const projectId = requireProjectIdHeader(request)
  const parsed = passkeyAuthenticateBeginBodySchema.parse(request.body)

  let userId: string | null = null
  let allowCredentials:
    | Array<{ id: string; transports?: AuthenticatorTransportFuture[] }>
    | undefined

  if (parsed.email) {
    const user = await request.server.dbAdapter.getUserByEmail(projectId, parsed.email.trim().toLowerCase())

    if (user) {
      userId = user.id
      const passkeys = await request.server.dbAdapter.getPasskeysByUserId(user.id)

      allowCredentials = passkeys.map((passkey) => {
        const transports = toAuthenticatorTransports(passkey.transports)

        return {
          id: passkey.credentialId,
          ...(transports && transports.length > 0 ? { transports } : {}),
        }
      })
    }
  }

  const authenticationOptions = {
    rpID: rpId(),
    userVerification: 'preferred',
    ...(allowCredentials && allowCredentials.length > 0 ? { allowCredentials } : {}),
  } as const

  const options = await generateAuthenticationOptions(authenticationOptions)

  await storeChallenge(request, {
    type: 'authentication',
    projectId,
    userId,
    challenge: options.challenge,
  })

  reply.send({
    data: {
      options,
    },
    error: null,
  })
}

export async function passkeyAuthenticateCompleteHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const parsed = passkeyAuthenticateCompleteBodySchema.parse(request.body)

  const challenge = readClientDataChallenge(parsed.credential)
  const challengeState = await consumeChallenge(request, challenge)

  if (challengeState.type !== 'authentication') {
    throw Errors.PASSKEY_CHALLENGE_INVALID()
  }

  const credentialId = readCredentialId(parsed.credential)
  const userHandle = readUserHandle(parsed.credential)
  const resolvedUserId = challengeState.userId ?? userHandle

  if (!resolvedUserId) {
    throw Errors.UNAUTHORIZED()
  }

  const user = await request.server.dbAdapter.getUserById(challengeState.projectId, resolvedUserId)

  if (!user || user.deletedAt || user.bannedAt) {
    throw Errors.UNAUTHORIZED()
  }

  const passkeys = await request.server.dbAdapter.getPasskeysByUserId(user.id)
  const passkey = passkeys.find((candidate) => candidate.credentialId === credentialId)

  if (!passkey) {
    throw Errors.UNAUTHORIZED()
  }

  const transports = toAuthenticatorTransports(passkey.transports)
  const credential: StoredWebAuthnCredential = {
    id: passkey.credentialId,
    publicKey: decodeBase64Url(passkey.publicKey),
    counter: passkey.counter,
    ...(transports && transports.length > 0 ? { transports } : {}),
  }

  const verification = await verifyAuthenticationResponse({
    response: parsed.credential as never,
    expectedChallenge: challengeState.challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpId(),
    credential,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.authenticationInfo) {
    throw Errors.PASSKEY_VERIFICATION_FAILED()
  }

  const newCounter = verification.authenticationInfo.newCounter

  await request.server.dbAdapter.updatePasskeyCounter(passkey.credentialId, newCounter)

  const refresh = issueRefreshToken(32)
  const tokenFamily = createTokenFamilyId()
  const expiresAt = new Date(Date.now() + config.sessionDurationSeconds * 1000)

  const sessionInput = {
    userId: user.id,
    projectId: challengeState.projectId,
    tokenHash: refresh.tokenHash,
    tokenFamily,
    ipAddress: request.ip,
    expiresAt,
    ...(typeof request.headers['user-agent'] === 'string'
      ? { userAgent: request.headers['user-agent'] }
      : {}),
  }

  const session = await request.server.dbAdapter.createSession(sessionInput)

  const accessToken = await issueAccessToken({
    context: {
      userId: user.id,
      sessionId: session.id,
      projectId: challengeState.projectId,
      email: user.email,
      emailVerified: user.emailVerified,
      issuer: config.baseUrl,
    },
    ttlSeconds: config.accessTokenTtlSeconds,
    privateKey: createPrivateKey(config.jwtPrivateKey),
  })

  setRefreshTokenCookie(reply, refresh.token, config.nodeEnv === 'production')

  if (typeof request.server.emitWebhookEvent === 'function') {
    try {
      await request.server.emitWebhookEvent({
        type: 'user.signed_in',
        projectId: challengeState.projectId,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
          },
          session: {
            id: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          },
        },
      })

      await request.server.emitWebhookEvent({
        type: 'session.created',
        projectId: challengeState.projectId,
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
          },
          session: {
            id: session.id,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          },
        },
      })
    } catch (error) {
      request.log.warn({ error }, 'Failed to enqueue passkey authentication webhook events')
    }
  }

  if (typeof request.server.emitAuditEvent === 'function') {
    await request.server.emitAuditEvent({
      projectId: challengeState.projectId,
      userId: user.id,
      event: 'user.signed_in',
      request,
      metadata: {
        method: 'passkey',
      },
    })

    await request.server.emitAuditEvent({
      projectId: challengeState.projectId,
      userId: user.id,
      event: 'session.created',
      request,
      metadata: {
        sessionId: session.id,
      },
    })
  }

  reply.send({
    data: {
      user,
      accessToken,
    },
    error: null,
  })
}
