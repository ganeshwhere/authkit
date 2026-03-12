declare module 'nodemailer' {
  export type SendMailOptions = {
    to: string
    from?: string
    replyTo?: string
    subject: string
    html: string
    text: string
  }

  export interface Transporter {
    sendMail(message: SendMailOptions): Promise<unknown>
  }

  export function createTransport(options?: unknown): Transporter

  const nodemailer: {
    createTransport: typeof createTransport
  }

  export default nodemailer
}
