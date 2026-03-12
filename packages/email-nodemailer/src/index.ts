import nodemailer, { type Transporter } from 'nodemailer'

import type { EmailAdapter, EmailMessage } from '@authkit/core'

export type NodemailerAdapterOptions = {
  transporter?: Transporter
  transport?: Parameters<typeof nodemailer.createTransport>[0]
  defaultFrom?: string
}

export function createNodemailerAdapter(options: NodemailerAdapterOptions): EmailAdapter {
  const transporter = options.transporter ?? nodemailer.createTransport(options.transport ?? {})

  return {
    async send(message: EmailMessage): Promise<void> {
      await transporter.sendMail({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...((message.from ?? options.defaultFrom)
          ? { from: message.from ?? options.defaultFrom }
          : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      })
    },
  }
}
