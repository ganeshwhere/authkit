import { runCommand } from '../utils/exec'

export async function runDbPush(cwd: string): Promise<void> {
  await runCommand('pnpm', ['--filter', '@authkit/server', 'db:generate'], cwd)
  await runCommand('pnpm', ['--filter', '@authkit/server', 'db:migrate'], cwd)
}

export async function runDbMigrate(cwd: string): Promise<void> {
  await runCommand('pnpm', ['--filter', '@authkit/server', 'db:migrate'], cwd)
}
