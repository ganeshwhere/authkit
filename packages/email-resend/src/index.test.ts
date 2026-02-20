import { describe, expect, it, vi } from 'vitest'

import { createResendAdapter } from './index'

describe('createResendAdapter', () => {
  it('posts email payload to resend api', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))

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

    const request = fetchMock.mock.calls[0]
    expect(request?.[0]).toBe('https://api.resend.com/emails')
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
