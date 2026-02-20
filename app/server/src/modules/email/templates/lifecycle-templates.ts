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

export function renderWelcomeTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const primary = input.primaryColor ?? '#2563eb'

  return shell(
    `Welcome to ${input.appName}`,
    `You're all set`,
    `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;">Welcome to ${input.appName}. Your account is ready and secure.</p>
     <p style="margin:0 0 16px 0;"><a href="${actionUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Get started</a></p>
     <p style="margin:0;font-size:14px;color:#334155;">If this account wasn't created by you, contact support immediately.</p>`,
    `Welcome to ${input.appName}. Get started: ${actionUrl}\nIf this account wasn't created by you, contact support immediately.`,
    input,
  )
}

export function renderNewDeviceLoginTemplate(input: EmailTemplateInput): RenderedEmailTemplate {
  const actionUrl = input.actionUrl ?? 'https://example.com'
  const location = input.location ?? 'Unknown location'
  const deviceInfo = input.deviceInfo ?? 'Unknown device'
  const primary = input.primaryColor ?? '#2563eb'

  return shell(
    `New sign-in from ${location}`,
    'We noticed a new device sign-in',
    `<p style="margin:0 0 14px 0;color:#334155;font-size:15px;">A recent sign-in was detected on your account.</p>
     <p style="margin:0 0 12px 0;font-size:14px;color:#334155;"><strong>Location:</strong> ${location}<br/><strong>Device:</strong> ${deviceInfo}</p>
     <p style="margin:0 0 16px 0;"><a href="${actionUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Review account activity</a></p>
     <p style="margin:0;font-size:14px;color:#334155;">If this wasn't you, revoke active sessions and reset your password immediately.</p>`,
    `New sign-in detected. Location: ${location}. Device: ${deviceInfo}. Review activity: ${actionUrl}\nIf this wasn't you, revoke active sessions and reset your password immediately.`,
    input,
  )
}
