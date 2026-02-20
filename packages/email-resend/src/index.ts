import type { EmailAdapter, EmailMessage } from '@authkit/core'

export type ResendAdapterOptions = {
  apiKey: string
  defaultFrom: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export function createResendAdapter(options: ResendAdapterOptions): EmailAdapter {
  const baseUrl = options.baseUrl ?? 'https://api.resend.com'
  const fetchImpl = options.fetchImpl ?? fetch

  return {
    async send(message: EmailMessage): Promise<void> {
      const response = await fetchImpl(`${baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from ?? options.defaultFrom,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Resend email send failed: ${response.status} ${errorBody}`)
      }
    },
  }
}
