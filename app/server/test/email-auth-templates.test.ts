import { describe, expect, it } from 'vitest'

import { renderEmailTemplate } from '../src/modules/email/templates'

describe('auth email templates', () => {
  const baseInput = {
    appName: 'AuthKit',
    userEmail: 'user@example.com',
    actionUrl: 'https://app.example.com/action',
    expiresInText: '15 minutes',
  }

  it('renders magic link template with security note', () => {
    const result = renderEmailTemplate('magic_link', baseInput)

    expect(result.subject).toBe('Your sign-in link')
    expect(result.html).toContain('Sign in now')
    expect(result.text).toContain('ignore this email')
  })

  it('renders verify email template', () => {
    const result = renderEmailTemplate('email_verify', baseInput)

    expect(result.subject).toBe('Verify your email')
    expect(result.html).toContain('Verify email')
    expect(result.text).toContain('verification link')
  })

  it('renders password reset template with expiry notice', () => {
    const result = renderEmailTemplate('password_reset', {
      ...baseInput,
      expiresInText: '1 hour',
    })

    expect(result.subject).toBe('Reset your password')
    expect(result.html).toContain('Reset password')
    expect(result.text).toContain('Expires in 1 hour')
  })
})
