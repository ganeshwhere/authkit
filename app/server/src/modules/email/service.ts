import type { EmailAdapter, EmailMessage } from '../../types/adapters'
import {
  renderEmailTemplate,
  type EmailTemplateInput,
  type EmailTemplateType,
  type RenderedEmailTemplate,
} from './templates'

export type SendTemplateEmailInput = {
  to: string
  template: EmailTemplateType
  variables: EmailTemplateInput
  from?: string
  replyTo?: string
}

export class EmailService {
  constructor(
    private readonly adapter: EmailAdapter,
    private readonly defaultFrom: string,
  ) {}

  render(template: EmailTemplateType, variables: EmailTemplateInput): RenderedEmailTemplate {
    return renderEmailTemplate(template, variables)
  }

  async sendTemplate(input: SendTemplateEmailInput): Promise<void> {
    const rendered = this.render(input.template, input.variables)

    const message: EmailMessage = {
      to: input.to,
      from: input.from ?? this.defaultFrom,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    }

    await this.adapter.send(message)
  }

  async send(message: EmailMessage): Promise<void> {
    await this.adapter.send({
      ...message,
      from: message.from ?? this.defaultFrom,
    })
  }
}
