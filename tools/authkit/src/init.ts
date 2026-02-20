import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import {
  type InitSelections,
  detectProject,
  writeInitFiles,
} from './scaffold'

type Choice<TValue extends string> = {
  label: string
  value: TValue
}

async function promptSingleChoice<TValue extends string>(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  choices: Choice<TValue>[],
): Promise<TValue> {
  output.write(`${prompt}\n`)
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`)
  })

  while (true) {
    const answer = (await rl.question('Select option number: ')).trim()
    const selectedIndex = Number.parseInt(answer, 10) - 1
    const selected = choices[selectedIndex]

    if (selected) {
      return selected.value
    }

    output.write('Please enter a valid option number.\n')
  }
}

async function promptMultiChoice(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  choices: Choice<string>[],
): Promise<string[]> {
  output.write(`${prompt}\n`)
  choices.forEach((choice, index) => {
    output.write(`  ${index + 1}. ${choice.label}\n`)
  })
  output.write('Select one or more numbers (comma separated): ')

  while (true) {
    const answer = (await rl.question('')).trim()
    const indexes = answer
      .split(',')
      .map((chunk) => Number.parseInt(chunk.trim(), 10) - 1)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < choices.length)

    const uniqueIndexes = Array.from(new Set(indexes))
    if (uniqueIndexes.length > 0) {
      return uniqueIndexes.map((index) => choices[index]!.label)
    }

    output.write('Please provide at least one valid selection.\n')
  }
}

function selectedPackages(selections: InitSelections): string[] {
  const packages = ['@authkit/nextjs']

  switch (selections.orm) {
    case 'prisma':
      packages.push('@authkit/adapter-prisma')
      break
    case 'drizzle':
      packages.push('@authkit/adapter-drizzle')
      break
    default:
      break
  }

  switch (selections.emailProvider) {
    case 'resend':
      packages.push('@authkit/email-resend')
      break
    case 'postmark':
      packages.push('@authkit/email-postmark')
      break
    case 'sendgrid':
      packages.push('@authkit/email-sendgrid')
      break
    case 'smtp':
      packages.push('@authkit/email-nodemailer')
      break
    default:
      break
  }

  return packages
}

export async function runInitWizard(cwd: string): Promise<void> {
  const detection = await detectProject(cwd)
  const rl = createInterface({ input, output })

  try {
    output.write("Welcome to AuthKit! Let's get you set up.\n\n")
    output.write(`Detected: ${detection.framework}\n\n`)

    const runtime = await promptSingleChoice(rl, 'Where are you running AuthKit?', [
      { label: 'Hosted (authkit.dev)', value: 'hosted' },
      { label: 'Self-hosted (Docker)', value: 'self-hosted' },
    ])

    const database = await promptSingleChoice(rl, 'Which database do you use?', [
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MySQL', value: 'mysql' },
      { label: 'SQLite', value: 'sqlite' },
      { label: 'MongoDB', value: 'mongodb' },
    ])

    const orm = await promptSingleChoice(rl, 'Which ORM should AuthKit integrate with?', [
      { label: 'Prisma', value: 'prisma' },
      { label: 'Drizzle', value: 'drizzle' },
      { label: 'Raw SQL', value: 'raw-sql' },
      { label: 'None', value: 'none' },
    ])

    const emailProvider = await promptSingleChoice(rl, 'Which email provider do you want?', [
      { label: 'Resend', value: 'resend' },
      { label: 'Postmark', value: 'postmark' },
      { label: 'SendGrid', value: 'sendgrid' },
      { label: 'SMTP', value: 'smtp' },
    ])

    const authMethods = await promptMultiChoice(rl, 'Which auth methods should be enabled?', [
      { label: 'Email + Password', value: 'email-password' },
      { label: 'Magic Link', value: 'magic-link' },
      { label: 'Google OAuth', value: 'google-oauth' },
      { label: 'GitHub OAuth', value: 'github-oauth' },
      { label: 'Passkeys', value: 'passkeys' },
    ])

    const selections: InitSelections = {
      runtime,
      database,
      orm,
      emailProvider,
      authMethods,
    }

    output.write('\nInstalling packages...\n')
    selectedPackages(selections).forEach((pkg) => {
      output.write(`  - ${pkg}\n`)
    })

    output.write('\nCreating files...\n')
    const writtenFiles = await writeInitFiles(cwd, selections)
    writtenFiles.forEach((file) => {
      output.write(`  - ${file}\n`)
    })

    output.write('\nNext steps:\n')
    output.write('  1. Fill in your API keys in .env.local\n')
    output.write('  2. Run your database migrations\n')
    output.write('  3. Start your app and visit /sign-in\n')
  } finally {
    rl.close()
  }
}
