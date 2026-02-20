import { describe, expect, it, vi } from 'vitest'

import { createNodemailerAdapter } from './index'

describe('createNodemailerAdapter', () => {
  it('forwards message payload to transporter sendMail', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'msg_1' }))

    const adapter = createNodemailerAdapter({
      transporter: {
        sendMail,
      } as never,
      defaultFrom: 'auth@example.com',
    })

    await adapter.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })

    expect(sendMail).toHaveBeenCalledWith({
      to: 'user@example.com',
      from: 'auth@example.com',
      replyTo: undefined,
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })
  })
})
