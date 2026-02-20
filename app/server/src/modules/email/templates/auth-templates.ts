import type { EmailTemplateInput, RenderedEmailTemplate } from '../templates'

function shell(
  subject: string,
  heading: string,
  bodyHtml: string,
  bodyText: string,
  input: EmailTemplateInput,
): RenderedEmailTemplate {
  const logo = input.appLogo
    ? `<img src="${input.appLogo}" alt="${input.appName}" style="max-width: 140px; margin-bottom: 16px;" />`
    : `<h1 style="margin:0 0 14px 0;font-size:22px;color:#0f172a;">${input.appName}</h1>`

  const html = `
  <div style="margin:0;background:#f8fafc;padding:28px 14px;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:26px;">
      ${logo}
      <h2 style="margin:0 0 14px 0;color:#0f172a;font-size:20px;">${heading}</h2>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
      <p style="margin:0;font-size:12px;color:#64748b;">This message was sent to ${input.userEmail}.</p>
    </div>
  </div>
  `.trim()

  return {
    subject,
    html,
    text: bodyText,
  }
}

export function renderMagicLinkTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const expiresIn = input.expiresInText ?? '15 minutes'
  const primary = input.primaryColor ?? '#2563eb'

  return shell(
    'Your sign-in link',
    'Use this secure sign-in link',
    `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;">Tap the button below to sign in to your account.</p>
     <p style="margin:0 0 16px 0;"><a href="${actionUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Sign in now</a></p>
     <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">This link expires in ${expiresIn}.</p>
     <p style="margin:0;font-size:14px;color:#334155;">If you didn't request this, ignore this email.</p>`,
    `Sign in link: ${actionUrl}\nExpires in ${expiresIn}.\nIf you did not request this, ignore this email.`,
    input,
  )
}

export function renderVerifyEmailTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const expiresIn = input.expiresInText ?? '24 hours'
  const primary = input.primaryColor ?? '#2563eb'

  return shell(
    'Verify your email',
    'Confirm your email address',
    `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;">Verify your email to secure your account and complete setup.</p>
     <p style="margin:0 0 16px 0;"><a href="${actionUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Verify email</a></p>
     <p style="margin:0;font-size:14px;color:#334155;">This verification link expires in ${expiresIn}.</p>`,
    `Verify your email: ${actionUrl}\nThis verification link expires in ${expiresIn}.`,
    input,
  )
}

export function renderPasswordResetTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const expiresIn = input.expiresInText ?? '1 hour'
  const primary = input.primaryColor ?? '#2563eb'

  return shell(
    'Reset your password',
    'Reset your password securely',
    `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;">You requested a password reset. Use the secure button below.</p>
     <p style="margin:0 0 16px 0;"><a href="${actionUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Reset password</a></p>
     <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">This reset link expires in ${expiresIn}.</p>
     <p style="margin:0;font-size:14px;color:#334155;">If this request wasn't made by you, ignore this email and keep your password unchanged.</p>`,
    `Reset password link: ${actionUrl}\nExpires in ${expiresIn}.\nIf this wasn't you, ignore this email.`,
    input,
  )
}
