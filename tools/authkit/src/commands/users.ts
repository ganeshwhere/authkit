import { readEnvFile } from '../utils/env'

type ServerAuthContext = {
  baseUrl: string
  projectId: string
  secretKey: string
}

type ApiEnvelope<TPayload> = {
  data: TPayload | null
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  } | null
}

async function resolveServerAuthContext(cwd: string): Promise<ServerAuthContext> {
  const env = await readEnvFile(cwd)

  const baseUrl = process.env.AUTHKIT_BASE_URL ?? env.get('AUTHKIT_BASE_URL') ?? 'http://localhost:3001'
  const projectId = process.env.AUTHKIT_PROJECT_ID ?? env.get('AUTHKIT_PROJECT_ID')
  const secretKey =
    process.env.AUTHKIT_SECRET_KEY ??
    env.get('AUTHKIT_SECRET_KEY') ??
    process.env.HMAC_SECRET ??
    env.get('HMAC_SECRET')

  if (!projectId) {
    throw new Error('AUTHKIT_PROJECT_ID is required in .env or environment variables')
  }
  if (!secretKey) {
    throw new Error('AUTHKIT_SECRET_KEY or HMAC_SECRET is required in .env or environment variables')
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    projectId,
    secretKey,
  }
}

async function authkitRequest<TPayload>(
  context: ServerAuthContext,
  path: string,
  options: RequestInit = {},
): Promise<TPayload> {
  const response = await fetch(`${context.baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-authkit-secret-key': context.secretKey,
      'x-authkit-project-id': context.projectId,
      ...(options.headers ?? {}),
    },
  })

  const payload = (await response.json()) as ApiEnvelope<TPayload>
  if (!response.ok || payload.error || payload.data === null) {
    const errorMessage = payload.error?.message ?? `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return payload.data
}

export async function runUsersList(cwd: string): Promise<void> {
  const context = await resolveServerAuthContext(cwd)
  const payload = await authkitRequest<{ users: Array<{ id: string; email: string }>; total: number }>(
    context,
    '/v1/api/users?limit=20&offset=0',
    {
      method: 'GET',
    },
  )

  process.stdout.write(`Total users: ${payload.total}\n`)
  payload.users.forEach((user) => {
    process.stdout.write(`- ${user.id} ${user.email}\n`)
  })
}

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag)
  if (index === -1) {
    return null
  }

  const next = args[index + 1]
  return typeof next === 'string' ? next : null
}

export async function runUsersCreate(cwd: string, args: string[]): Promise<void> {
  const email = getArgValue(args, '--email')
  const displayName = getArgValue(args, '--display-name')

  if (!email) {
    throw new Error('Missing required --email argument')
  }

  const context = await resolveServerAuthContext(cwd)
  const payload = await authkitRequest<{ user: { id: string; email: string } }>(
    context,
    '/v1/api/users',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        displayName: displayName ?? undefined,
      }),
    },
  )

  process.stdout.write(`Created user ${payload.user.id} (${payload.user.email})\n`)
}
