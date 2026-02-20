import { describe, expect, it } from 'vitest'

import { generateSecrets } from './keys'

describe('generateSecrets', () => {
  it('creates rsa keys and random secrets', () => {
    const secrets = generateSecrets()

    expect(secrets.jwtPrivateKey).toContain('BEGIN RSA PRIVATE KEY')
    expect(secrets.jwtPublicKey).toContain('BEGIN RSA PUBLIC KEY')
    expect(secrets.jwtPrivateKey).toContain('\\n')
    expect(secrets.encryptionKey).toHaveLength(64)
    expect(secrets.hmacSecret).toHaveLength(64)
  })
})
