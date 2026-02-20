import {
  renderMagicLinkTemplate,
  renderPasswordResetTemplate,
  renderVerifyEmailTemplate,
} from './templates/auth-templates'

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

function renderShell(contentHtml: string, contentText: string, input: EmailTemplateInput): RenderedEmailTemplate {
  const logoHtml = input.appLogo
    ? `<img src="${input.appLogo}" alt="${input.appName}" style="max-width: 140px; margin-bottom: 16px;" />`
    : `<h1 style="margin:0 0 12px 0; color:${input.primaryColor ?? '#0f172a'};">${input.appName}</h1>`

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
      ${logoHtml}
      ${contentHtml}
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">This email was intended for ${input.userEmail}.</p>
    </div>
  </div>
  `.trim()

  return {
    subject: '',
    html,
    text: contentText,
  }
}

export function renderEmailTemplate(
  template: EmailTemplateType,
  input: EmailTemplateInput,
): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const primary = input.primaryColor ?? '#2563eb'

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
    const shell = renderShell(
      `<p>Welcome to ${input.appName}. Your account is ready.</p>
       <p><a href="${actionUrl}" style="display:inline-block;padding:12px 18px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;">Get started</a></p>`,
      `Welcome to ${input.appName}. Get started: ${actionUrl}`,
      input,
    )

    return {
      ...shell,
      subject: `Welcome to ${input.appName}`,
    }
  }

  const shell = renderShell(
    `<p>We detected a new sign-in to your account.</p>
     <p style="font-size:14px;color:#334155;">Location: ${input.location ?? 'Unknown'}<br/>Device: ${input.deviceInfo ?? 'Unknown device'}</p>
     <p><a href="${actionUrl}" style="display:inline-block;padding:12px 18px;background:${primary};color:#fff;text-decoration:none;border-radius:8px;">Review activity</a></p>`,
    `New sign-in detected. Location: ${input.location ?? 'Unknown'}. Device: ${input.deviceInfo ?? 'Unknown device'}. Review: ${actionUrl}`,
    input,
  )

  return {
    ...shell,
    subject: `New sign-in from ${input.location ?? 'Unknown location'}`,
  }
}
