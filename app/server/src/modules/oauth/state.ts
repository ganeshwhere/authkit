import { z } from 'zod'

import type { CacheAdapter } from '../../types/adapters'
import { generateSecureToken } from '../../utils/crypto'
import { Errors } from '../../utils/errors'

const OAUTH_STATE_TTL_SECONDS = 600

const oauthStateRecordSchema = z.object({
  projectId: z.string().min(1),
  provider: z.string().min(1),
  redirectUrl: z.string().url(),
  clientState: z.string().max(500).nullable(),
})

export type OAuthStateRecord = z.infer<typeof oauthStateRecordSchema>

function buildStateKey(state: string): string {
  return `oauth:state:${state}`
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function isAllowedRedirect(redirectUrl: URL, allowlist: string[]): boolean {
  return allowlist.some((allowedEntry) => {
    const allowed = parseUrl(allowedEntry)

    if (!allowed) {
      return false
    }

    if (allowed.origin !== redirectUrl.origin) {
      return false
    }

    return redirectUrl.pathname.startsWith(allowed.pathname)
  })
}

export function resolveOAuthRedirectUrl(
  requestedRedirectUrl: string | undefined,
  allowlist: string[],
): string {
  if (allowlist.length === 0) {
    throw Errors.INVALID_REDIRECT_URI()
  }

  const chosen = requestedRedirectUrl ?? allowlist[0]

  if (!chosen) {
    throw Errors.INVALID_REDIRECT_URI()
  }

  const parsed = parseUrl(chosen)

  if (!parsed || !isAllowedRedirect(parsed, allowlist)) {
    throw Errors.INVALID_REDIRECT_URI()
  }

  return parsed.toString()
}

export async function createOAuthState(
  cache: CacheAdapter,
  payload: OAuthStateRecord,
): Promise<string> {
  const state = generateSecureToken(24)

  await cache.set(buildStateKey(state), JSON.stringify(payload), OAUTH_STATE_TTL_SECONDS)

  return state
}

export async function consumeOAuthState(
  cache: CacheAdapter,
  state: string,
): Promise<OAuthStateRecord> {
  const key = buildStateKey(state)
  const raw = await cache.get(key)

  if (!raw) {
    throw Errors.INVALID_OAUTH_STATE()
  }

  await cache.delete(key)

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw Errors.INVALID_OAUTH_STATE()
  }

  const validated = oauthStateRecordSchema.safeParse(parsed)

  if (!validated.success) {
    throw Errors.INVALID_OAUTH_STATE()
  }

  return validated.data
}
