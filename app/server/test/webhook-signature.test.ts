import { describe, expect, it } from 'vitest'

import {
  buildWebhookSignatureHeader,
  verifyWebhookSignature,
} from '../src/modules/webhooks/signature'

describe('webhook signature', () => {
  it('builds signed header and verifies payload successfully', () => {
    const payload = JSON.stringify({ type: 'user.created', id: 'evt_1' })
    const header = buildWebhookSignatureHeader(payload, 'super-secret', 1_700_000_000)

    expect(header.startsWith('t=1700000000,v1=')).toBe(true)
    expect(
      verifyWebhookSignature(payload, header, 'super-secret', 300, 1_700_000_100),
    ).toBe(true)
  })

  it('fails verification for tampered payload or stale timestamp', () => {
    const payload = JSON.stringify({ type: 'user.created', id: 'evt_1' })
    const header = buildWebhookSignatureHeader(payload, 'super-secret', 1_700_000_000)

    expect(
      verifyWebhookSignature(
        JSON.stringify({ type: 'user.created', id: 'evt_2' }),
        header,
        'super-secret',
        300,
        1_700_000_100,
      ),
    ).toBe(false)

    expect(
      verifyWebhookSignature(payload, header, 'super-secret', 300, 1_700_001_000),
    ).toBe(false)
  })
})
