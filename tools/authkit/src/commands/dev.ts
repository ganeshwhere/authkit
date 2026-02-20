import { runCommand } from '../utils/exec'

export async function runDev(cwd: string): Promise<void> {
  await runCommand('pnpm', ['--filter', '@authkit/server', 'dev'], cwd)
}
