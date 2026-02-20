import { promises as fs } from 'node:fs'
import path from 'node:path'

export type InitSelections = {
  runtime: 'hosted' | 'self-hosted'
  database: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'
  orm: 'prisma' | 'drizzle' | 'raw-sql' | 'none'
  emailProvider: 'resend' | 'postmark' | 'sendgrid' | 'smtp'
  authMethods: string[]
}

export type ProjectDetection = {
  framework: string
  packageName: string | null
}

type PackageJsonShape = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export async function detectProject(cwd: string): Promise<ProjectDetection> {
  const packagePath = path.join(cwd, 'package.json')
  let packageJson: PackageJsonShape | null = null

  try {
    const raw = await fs.readFile(packagePath, 'utf8')
    packageJson = JSON.parse(raw) as PackageJsonShape
  } catch {
    packageJson = null
  }

  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  }

  const hasNext = typeof dependencies.next === 'string'
  const framework = hasNext ? 'Next.js (App Router)' : 'Unknown framework'

  return {
    framework,
    packageName: packageJson?.name ?? null,
  }
}

export function buildAuthConfigContent(selections: InitSelections): string {
  return [
    'import type { AuthKitConfig } from \'@authkit/core\'',
    '',
    'export const authConfig: AuthKitConfig = {',
    '  projectId: process.env.AUTHKIT_PROJECT_ID ?? \'project_id_here\',',
    '  publicKey: process.env.NEXT_PUBLIC_AUTHKIT_PUBLIC_KEY ?? \'pk_test_...\',',
    '  baseUrl: process.env.AUTHKIT_BASE_URL ?? \'http://localhost:3001\',',
    '  methods: {',
    `    password: { enabled: ${selections.authMethods.includes('Email + Password')} },`,
    `    magicLink: { enabled: ${selections.authMethods.includes('Magic Link')} },`,
    `    passkeys: { enabled: ${selections.authMethods.includes('Passkeys')} },`,
    '  },',
    '}',
    '',
  ].join('\n')
}

export function buildMiddlewareContent(): string {
  return [
    'import { authMiddleware } from \'@authkit/nextjs\'',
    '',
    'export default authMiddleware({',
    '  publicRoutes: [\'/\', \'/login\', \'/signup\'],',
    '})',
    '',
    'export const config = {',
    '  matcher: [\'/((?!_next/static|_next/image|favicon.ico).*)\'],',
    '}',
    '',
  ].join('\n')
}

export function buildRouteHandlerContent(): string {
  return [
    'export { GET, POST } from \'@authkit/nextjs/server\'',
    '',
  ].join('\n')
}

export function buildEnvLocalContent(selections: InitSelections): string {
  return [
    '# AuthKit',
    'AUTHKIT_PROJECT_ID=project_id_here',
    'NEXT_PUBLIC_AUTHKIT_PUBLIC_KEY=pk_test_...',
    `AUTHKIT_BASE_URL=${selections.runtime === 'hosted' ? 'https://api.authkit.dev' : 'http://localhost:3001'}`,
    '',
    '# Provider placeholders',
    'AUTHKIT_SECRET_KEY=sk_test_...',
    'AUTHKIT_EMAIL_FROM=auth@example.com',
    '',
  ].join('\n')
}

export async function writeInitFiles(cwd: string, selections: InitSelections): Promise<string[]> {
  const filesToWrite = [
    {
      path: path.join(cwd, 'auth.config.ts'),
      content: buildAuthConfigContent(selections),
    },
    {
      path: path.join(cwd, 'middleware.ts'),
      content: buildMiddlewareContent(),
    },
    {
      path: path.join(cwd, '.env.local'),
      content: buildEnvLocalContent(selections),
    },
    {
      path: path.join(cwd, 'app/api/auth/[...authkit]/route.ts'),
      content: buildRouteHandlerContent(),
    },
  ]

  const written: string[] = []

  for (const file of filesToWrite) {
    await fs.mkdir(path.dirname(file.path), { recursive: true })
    await fs.writeFile(file.path, file.content, 'utf8')
    written.push(path.relative(cwd, file.path))
  }

  return written
}
