import type { EmailAdapter, EmailMessage } from '../../types/adapters'

export function createLogEmailAdapter(log: {
  info: (payload: unknown, message?: string) => void
}): EmailAdapter {
  return {
    async send(message: EmailMessage): Promise<void> {
      log.info(
        {
          event: 'email.send',
          to: message.to,
          subject: message.subject,
        },
        'Email dispatched through log adapter',
      )
    },
  }
}
