import { describe, expect, it, vi } from 'vitest'

import { createResendAdapter } from './index'

describe('createResendAdapter', () => {
  it('posts email payload to resend api', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<{ ok: true; status: number }>>(
      async () => ({ ok: true, status: 200 }),
    )

    const adapter = createResendAdapter({
      apiKey: 'resend_api_key',
      defaultFrom: 'auth@example.com',
      fetchImpl: fetchMock as never,
      baseUrl: 'https://api.resend.com',
    })

    await adapter.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.resend.com/emails',
      expect.any(Object),
    )
  })

  it('throws on resend api error', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }))

    const adapter = createResendAdapter({
      apiKey: 'bad-key',
      defaultFrom: 'auth@example.com',
      fetchImpl: fetchMock as never,
      baseUrl: 'https://api.resend.com',
    })

    await expect(
      adapter.send({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
        text: 'Hello',
      }),
    ).rejects.toThrowError('Resend email send failed: 401 unauthorized')
  })
})
