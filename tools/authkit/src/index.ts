#!/usr/bin/env node

import { runInitWizard } from './init'

function printHelp(): void {
  process.stdout.write(
    [
      'AuthKit CLI',
      '',
      'Usage:',
      '  authkit init         Run interactive project setup wizard',
      '',
    ].join('\n'),
  )
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2)

  switch (command) {
    case 'init':
      await runInitWizard(process.cwd())
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
