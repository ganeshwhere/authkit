export class AuthKitError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AuthKitError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export const Errors = {
  INVALID_CREDENTIALS: (): AuthKitError =>
    new AuthKitError('INVALID_CREDENTIALS', 'Invalid email or password', 401),
  EMAIL_ALREADY_EXISTS: (): AuthKitError =>
    new AuthKitError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists', 409),
  ACCOUNT_BANNED: (): AuthKitError =>
    new AuthKitError('ACCOUNT_BANNED', 'This account has been banned', 403),
  ACCOUNT_NOT_FOUND: (): AuthKitError =>
    new AuthKitError('ACCOUNT_NOT_FOUND', 'No account found with this email', 404),
  ACCOUNT_LOCKED: (): AuthKitError =>
    new AuthKitError('ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.', 429),
  PROJECT_ID_REQUIRED: (): AuthKitError =>
    new AuthKitError('PROJECT_ID_REQUIRED', 'Project id header is required', 400),
  VALIDATION_ERROR: (details?: Record<string, unknown>): AuthKitError =>
    new AuthKitError('VALIDATION_ERROR', 'Request validation failed', 400, details),
  SIGNUPS_DISABLED: (): AuthKitError =>
    new AuthKitError('SIGNUPS_DISABLED', 'New account registration is currently disabled', 403),
  WEAK_PASSWORD: (score: number): AuthKitError =>
    new AuthKitError('WEAK_PASSWORD', 'Password is too weak', 400, { score }),
  INVALID_TOKEN: (): AuthKitError =>
    new AuthKitError('INVALID_TOKEN', 'Invalid or malformed token', 400),
  TOKEN_EXPIRED: (): AuthKitError => new AuthKitError('TOKEN_EXPIRED', 'This token has expired', 400),
  TOKEN_ALREADY_USED: (): AuthKitError =>
    new AuthKitError('TOKEN_ALREADY_USED', 'This token has already been used', 400),
  INVALID_REFRESH_TOKEN: (): AuthKitError =>
    new AuthKitError('INVALID_REFRESH_TOKEN', 'Invalid refresh token', 401),
  SESSION_EXPIRED: (): AuthKitError =>
    new AuthKitError('SESSION_EXPIRED', 'Session has expired', 401),
  TOKEN_REUSE_DETECTED: (): AuthKitError =>
    new AuthKitError('TOKEN_REUSE_DETECTED', 'Session security violation detected', 401),
  INVALID_CSRF_TOKEN: (): AuthKitError =>
    new AuthKitError('INVALID_CSRF_TOKEN', 'CSRF token validation failed', 403),
  UNAUTHORIZED: (): AuthKitError => new AuthKitError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: (): AuthKitError => new AuthKitError('FORBIDDEN', 'Insufficient permissions', 403),
  RATE_LIMIT_EXCEEDED: (): AuthKitError =>
    new AuthKitError('RATE_LIMIT_EXCEEDED', 'Too many requests, please slow down', 429),
  MFA_REQUIRED: (): AuthKitError =>
    new AuthKitError('MFA_REQUIRED', 'Multi-factor authentication required', 403),
  INVALID_MFA_CODE: (): AuthKitError =>
    new AuthKitError('INVALID_MFA_CODE', 'Invalid authentication code', 400),
  INVALID_MFA_TOKEN: (): AuthKitError =>
    new AuthKitError('INVALID_MFA_TOKEN', 'Invalid or expired MFA challenge token', 400),
  MFA_NOT_ENABLED: (): AuthKitError =>
    new AuthKitError('MFA_NOT_ENABLED', 'MFA is not enabled for this account', 400),
  MFA_ALREADY_ENABLED: (): AuthKitError =>
    new AuthKitError('MFA_ALREADY_ENABLED', 'MFA is already enabled for this account', 400),
  OAUTH_PROVIDER_NOT_CONFIGURED: (provider: string): AuthKitError =>
    new AuthKitError(
      'OAUTH_PROVIDER_NOT_CONFIGURED',
      `OAuth provider "${provider}" is not configured`,
      400,
    ),
  INVALID_REDIRECT_URI: (): AuthKitError =>
    new AuthKitError('INVALID_REDIRECT_URI', 'Invalid OAuth redirect URI', 400),
  INVALID_OAUTH_STATE: (): AuthKitError =>
    new AuthKitError('INVALID_OAUTH_STATE', 'Invalid or expired OAuth state', 400),
  OAUTH_AUTHORIZATION_FAILED: (): AuthKitError =>
    new AuthKitError('OAUTH_AUTHORIZATION_FAILED', 'OAuth authorization failed', 400),
  CANNOT_REMOVE_LAST_AUTH_METHOD: (): AuthKitError =>
    new AuthKitError(
      'CANNOT_REMOVE_LAST_AUTH_METHOD',
      'Cannot remove the last available authentication method',
      400,
    ),
  INTERNAL_ERROR: (): AuthKitError =>
    new AuthKitError('INTERNAL_ERROR', 'An unexpected error occurred', 500),
} as const

export type ErrorFactoryMap = typeof Errors
