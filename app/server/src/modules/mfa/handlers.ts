import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { requireAccessToken } from '../auth/access'
import {
  createTotpSetup,
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  hashBackupCodes,
  verifyAndConsumeBackupCode,
  verifyTotpCode,
} from './totp'
import { Errors } from '../../utils/errors'

const mfaCodeBodySchema = z.object({
  code: z.string().min(1).max(20),
})

const pendingSetupSchema = z.object({
  encryptedSecret: z.string().min(1),
  hashedBackupCodes: z.array(z.string().min(1)).min(1),
  backupCodes: z.array(z.string().min(1)).min(1),
})

const backupCodesSchema = z.array(z.string().min(1))

function setupCacheKey(userId: string): string {
  return `mfa:setup:${userId}`
}

function backupViewCacheKey(userId: string): string {
  return `mfa:backup:view:${userId}`
}

function parsePendingSetup(value: string): z.infer<typeof pendingSetupSchema> | null {
  try {
    const parsed = JSON.parse(value)
    const validated = pendingSetupSchema.safeParse(parsed)
    return validated.success ? validated.data : null
  } catch {
    return null
  }
}

function parseBackupCodes(value: string): string[] | null {
  try {
    const parsed = JSON.parse(value)
    const validated = backupCodesSchema.safeParse(parsed)
    return validated.success ? validated.data : null
  } catch {
    return null
  }
}

async function getCurrentUser(request: FastifyRequest): Promise<{
  userId: string
  projectId: string
}> {
  const auth = await requireAccessToken(request)
  const user = await request.server.dbAdapter.getUserById(auth.pid, auth.sub)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  return {
    userId: user.id,
    projectId: user.projectId,
  }
}

async function verifyActiveMfaCode(
  request: FastifyRequest,
  userId: string,
  code: string,
): Promise<boolean> {
  const mfa = await request.server.dbAdapter.getMFA(userId)

  if (!mfa) {
    throw Errors.MFA_NOT_ENABLED()
  }

  const secret = decryptTotpSecret(mfa.encryptedSecret)

  if (verifyTotpCode(secret, code)) {
    return true
  }

  const backup = verifyAndConsumeBackupCode(code, mfa.hashedBackupCodes)

  if (!backup.matched) {
    return false
  }

  await request.server.dbAdapter.updateBackupCodes(userId, backup.remaining)
  return true
}

export async function mfaTotpSetupHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = await requireAccessToken(request)
  const user = await request.server.dbAdapter.getUserById(auth.pid, auth.sub)

  if (!user || user.deletedAt) {
    throw Errors.UNAUTHORIZED()
  }

  const existingMfa = await request.server.dbAdapter.getMFA(user.id)

  if (existingMfa) {
    throw Errors.MFA_ALREADY_ENABLED()
  }

  const setup = createTotpSetup(user.email)
  const backupCodes = generateBackupCodes()

  const pending = {
    encryptedSecret: encryptTotpSecret(setup.secret),
    hashedBackupCodes: hashBackupCodes(backupCodes),
    backupCodes,
  }

  await request.server.cache.set(setupCacheKey(user.id), JSON.stringify(pending), 600)

  reply.send({
    data: {
      secret: setup.secret,
      qrCodeUrl: setup.qrCodeUrl,
      backupCodes,
    },
    error: null,
  })
}

export async function mfaTotpEnableHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { userId } = await getCurrentUser(request)
  const parsed = mfaCodeBodySchema.parse(request.body)

  const pendingRaw = await request.server.cache.get(setupCacheKey(userId))

  if (!pendingRaw) {
    throw Errors.MFA_NOT_ENABLED()
  }

  const parsedPending = parsePendingSetup(pendingRaw)

  if (!parsedPending) {
    throw Errors.MFA_NOT_ENABLED()
  }

  const secret = decryptTotpSecret(parsedPending.encryptedSecret)

  if (!verifyTotpCode(secret, parsed.code)) {
    throw Errors.INVALID_MFA_CODE()
  }

  try {
    await request.server.dbAdapter.createMFASecret(
      userId,
      parsedPending.encryptedSecret,
      parsedPending.hashedBackupCodes,
    )
  } catch {
    throw Errors.MFA_ALREADY_ENABLED()
  }

  await request.server.cache.delete(setupCacheKey(userId))
  await request.server.cache.set(
    backupViewCacheKey(userId),
    JSON.stringify(parsedPending.backupCodes),
    300,
  )

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function mfaTotpDisableHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { userId } = await getCurrentUser(request)
  const parsed = mfaCodeBodySchema.parse(request.body)

  const valid = await verifyActiveMfaCode(request, userId, parsed.code)

  if (!valid) {
    throw Errors.INVALID_MFA_CODE()
  }

  await request.server.dbAdapter.deleteMFA(userId)
  await request.server.cache.delete(setupCacheKey(userId))
  await request.server.cache.delete(backupViewCacheKey(userId))

  reply.send({
    data: {
      success: true,
    },
    error: null,
  })
}

export async function mfaBackupCodesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { userId } = await getCurrentUser(request)
  const key = backupViewCacheKey(userId)

  const raw = await request.server.cache.get(key)

  if (!raw) {
    reply.send({
      data: {
        codes: [],
      },
      error: null,
    })
    return
  }

  const parsed = parseBackupCodes(raw)

  await request.server.cache.delete(key)

  reply.send({
    data: {
      codes: parsed ?? [],
    },
    error: null,
  })
}

export async function mfaBackupCodesRegenerateHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { userId } = await getCurrentUser(request)
  const parsed = mfaCodeBodySchema.parse(request.body)

  const valid = await verifyActiveMfaCode(request, userId, parsed.code)

  if (!valid) {
    throw Errors.INVALID_MFA_CODE()
  }

  const codes = generateBackupCodes()
  const hashedCodes = hashBackupCodes(codes)

  await request.server.dbAdapter.updateBackupCodes(userId, hashedCodes)
  await request.server.cache.set(backupViewCacheKey(userId), JSON.stringify(codes), 300)

  reply.send({
    data: {
      codes,
    },
    error: null,
  })
}
