import { createHash } from 'node:crypto'

import { exportJWK, importSPKI, type JWK } from 'jose'

function computeKid(publicKeyPem: string): string {
  return createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16)
}

export async function publicKeyToJwk(publicKeyPem: string): Promise<JWK> {
  const key = await importSPKI(publicKeyPem, 'RS256')
  const jwk = await exportJWK(key)

  return {
    ...jwk,
    kid: computeKid(publicKeyPem),
    alg: 'RS256',
    use: 'sig',
  }
}

export async function buildJwks(publicKeys: string[]): Promise<{ keys: JWK[] }> {
  const keys = await Promise.all(publicKeys.map((publicKey) => publicKeyToJwk(publicKey)))

  return { keys }
}
