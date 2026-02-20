import { describe, expect, it, vi } from 'vitest'

import { EmailService } from '../src/modules/email/service'

describe('EmailService', () => {
  it('renders and sends a template message through adapter', async () => {
    const send = vi.fn(async () => undefined)
    const service = new EmailService({ send }, 'auth@example.com')

    await service.sendTemplate({
      to: 'user@example.com',
      template: 'magic_link',
      variables: {
        appName: 'AuthKit',
        userEmail: 'user@example.com',
        actionUrl: 'https://app.example.com/magic',
      },
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      to: 'user@example.com',
      from: 'auth@example.com',
      subject: 'Your sign-in link',
    })
  })

  it('sends raw message with default from', async () => {
    const send = vi.fn(async () => undefined)
    const service = new EmailService({ send }, 'auth@example.com')

    await service.send({
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })

    expect(send).toHaveBeenCalledWith({
      to: 'user@example.com',
      from: 'auth@example.com',
      subject: 'Hello',
      html: '<p>Hello</p>',
      text: 'Hello',
    })
  })
})
