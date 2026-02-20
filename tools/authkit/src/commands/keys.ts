import { generateKeyPairSync, randomBytes } from 'node:crypto'

import { upsertEnvValues } from '../utils/env'

function encodePemForEnv(value: string): string {
  return value.replace(/\n/g, '\\n')
}

export type GeneratedSecrets = {
  jwtPrivateKey: string
  jwtPublicKey: string
  encryptionKey: string
  hmacSecret: string
}

export function generateSecrets(): GeneratedSecrets {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  })

  return {
    jwtPrivateKey: encodePemForEnv(keyPair.privateKey),
    jwtPublicKey: encodePemForEnv(keyPair.publicKey),
    encryptionKey: randomBytes(32).toString('hex'),
    hmacSecret: randomBytes(32).toString('hex'),
  }
}

export async function runKeysGenerate(cwd: string): Promise<void> {
  const generated = generateSecrets()

  await upsertEnvValues(cwd, {
    JWT_PRIVATE_KEY: generated.jwtPrivateKey,
    JWT_PUBLIC_KEY: generated.jwtPublicKey,
    ENCRYPTION_KEY: generated.encryptionKey,
    HMAC_SECRET: generated.hmacSecret,
  })

  process.stdout.write('Generated JWT keys and secrets in .env\n')
}

export async function runKeysRotate(cwd: string): Promise<void> {
  const generated = generateSecrets()
  const rotatedAt = new Date().toISOString()

  await upsertEnvValues(cwd, {
    JWT_PRIVATE_KEY_NEXT: generated.jwtPrivateKey,
    JWT_PUBLIC_KEY_NEXT: generated.jwtPublicKey,
    JWT_KEY_ROTATED_AT: rotatedAt,
  })

  process.stdout.write('Generated next JWT key pair in .env\n')
}
