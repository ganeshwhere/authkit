import { describe, expect, it } from 'vitest'

import { renderEmailTemplate } from '../src/modules/email/templates'

describe('lifecycle email templates', () => {
  it('renders welcome template with onboarding CTA', () => {
    const result = renderEmailTemplate('welcome', {
      appName: 'AuthKit',
      userEmail: 'user@example.com',
      actionUrl: 'https://app.example.com/start',
    })

    expect(result.subject).toBe('Welcome to AuthKit')
    expect(result.html).toContain('Get started')
    expect(result.text).toContain('contact support immediately')
  })

  it('renders new device login template with review guidance', () => {
    const result = renderEmailTemplate('new_device_login', {
      appName: 'AuthKit',
      userEmail: 'user@example.com',
      actionUrl: 'https://app.example.com/security',
      location: 'Berlin, DE',
      deviceInfo: 'Chrome on macOS',
    })

    expect(result.subject).toBe('New sign-in from Berlin, DE')
    expect(result.html).toContain('Review account activity')
    expect(result.text).toContain('revoke active sessions')
  })
})
