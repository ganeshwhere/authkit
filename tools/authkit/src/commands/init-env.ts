import { runDbMigrate } from './db'
import { runKeysGenerate } from './keys'

export async function runInitEnv(cwd: string): Promise<void> {
  await runKeysGenerate(cwd)
  await runDbMigrate(cwd)
  process.stdout.write('Initialized .env and ran database migrations.\n')
}
