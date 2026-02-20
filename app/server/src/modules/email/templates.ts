import {
  renderMagicLinkTemplate,
  renderPasswordResetTemplate,
  renderVerifyEmailTemplate,
} from './templates/auth-templates'
import {
  renderNewDeviceLoginTemplate,
  renderWelcomeTemplate,
} from './templates/lifecycle-templates'

export type EmailTemplateType =
  | 'magic_link'
  | 'email_verify'
  | 'password_reset'
  | 'welcome'
  | 'new_device_login'

export type EmailTemplateInput = {
  appName: string
  appLogo?: string
  primaryColor?: string
  userEmail: string
  actionUrl?: string
  expiresInText?: string
  location?: string
  deviceInfo?: string
}

export type RenderedEmailTemplate = {
  subject: string
  html: string
  text: string
}

export function renderEmailTemplate(
  template: EmailTemplateType,
  input: EmailTemplateInput,
): RenderedEmailTemplate {
  if (template === 'magic_link') {
    return renderMagicLinkTemplate(input)
  }

  if (template === 'email_verify') {
    return renderVerifyEmailTemplate(input)
  }

  if (template === 'password_reset') {
    return renderPasswordResetTemplate(input)
  }

  if (template === 'welcome') {
    return renderWelcomeTemplate(input)
  }

  return renderNewDeviceLoginTemplate(input)
}
