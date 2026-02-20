#!/usr/bin/env node

import { runDbMigrate, runDbPush } from './commands/db'
import { runDev } from './commands/dev'
import { runInitEnv } from './commands/init-env'
import { runKeysGenerate, runKeysRotate } from './commands/keys'
import { runUsersCreate, runUsersList } from './commands/users'
import { runInitWizard } from './init'

function printHelp(): void {
  process.stdout.write(
    [
      'AuthKit CLI',
      '',
      'Usage:',
      '  authkit init         Run interactive project setup wizard',
      '  authkit dev          Start local AuthKit development server',
      '  authkit db push      Generate and apply DB changes',
      '  authkit db migrate   Run pending DB migrations',
      '  authkit keys generate Generate JWT keys and secrets into .env',
      '  authkit keys rotate  Generate next JWT key pair in .env',
      '  authkit users list   List users through management API',
      '  authkit users create --email <email> [--display-name <name>]',
      '  authkit init-env     Generate secrets and run migrations',
      '',
    ].join('\n'),
  )
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const [command, subcommand] = args

  switch (command) {
    case 'init':
      await runInitWizard(process.cwd())
      return
    case 'dev':
      await runDev(process.cwd())
      return
    case 'db':
      if (subcommand === 'push') {
        await runDbPush(process.cwd())
        return
      }
      if (subcommand === 'migrate') {
        await runDbMigrate(process.cwd())
        return
      }
      throw new Error('Unknown db command. Use "authkit db push" or "authkit db migrate".')
    case 'keys':
      if (subcommand === 'generate') {
        await runKeysGenerate(process.cwd())
        return
      }
      if (subcommand === 'rotate') {
        await runKeysRotate(process.cwd())
        return
      }
      throw new Error('Unknown keys command. Use "authkit keys generate" or "authkit keys rotate".')
    case 'users':
      if (subcommand === 'list') {
        await runUsersList(process.cwd())
        return
      }
      if (subcommand === 'create') {
        await runUsersCreate(process.cwd(), args.slice(2))
        return
      }
      throw new Error('Unknown users command. Use "authkit users list" or "authkit users create".')
    case 'init-env':
      await runInitEnv(process.cwd())
      return
    case '--help':
    case '-h':
    case undefined:
      printHelp()
      return
    default:
      process.stderr.write(`Unknown command: ${command}\n\n`)
      printHelp()
      process.exitCode = 1
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown CLI error'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
