import type { FastifyPluginAsync } from 'fastify'

import { forgotPasswordHandler } from '../modules/auth/forgot-password'
import {
  magicLinkSendHandler,
  magicLinkVerifyHandler,
} from '../modules/auth/magic-link'
import { mfaVerifyHandler } from '../modules/auth/mfa-verify'
import {
  mfaBackupCodesHandler,
  mfaBackupCodesRegenerateHandler,
  mfaTotpDisableHandler,
  mfaTotpEnableHandler,
  mfaTotpSetupHandler,
} from '../modules/mfa/handlers'
import {
  oauthBeginHandler,
  oauthCallbackHandler,
} from '../modules/oauth/handlers'
import { oauthDisconnectHandler } from '../modules/oauth/disconnect'
import {
  passkeyAuthenticateBeginHandler,
  passkeyAuthenticateCompleteHandler,
  passkeyRegisterBeginHandler,
  passkeyRegisterCompleteHandler,
} from '../modules/passkeys/handlers'
import { refreshHandler } from '../modules/auth/refresh'
import { resetPasswordHandler } from '../modules/auth/reset-password'
import { signinHandler } from '../modules/auth/signin'
import { signoutHandler } from '../modules/auth/signout'
import { signupHandler } from '../modules/auth/signup'
import { verifyEmailHandler } from '../modules/auth/verify-email'

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/signup', signupHandler)
  server.post('/signin', signinHandler)
  server.post('/signout', signoutHandler)
  server.post('/refresh', refreshHandler)
  server.post('/magic-link/send', magicLinkSendHandler)
  server.get('/magic-link/verify', magicLinkVerifyHandler)
  server.post('/forgot-password', forgotPasswordHandler)
  server.post('/reset-password', resetPasswordHandler)
  server.post('/verify-email', verifyEmailHandler)
  server.post('/mfa/verify', mfaVerifyHandler)
  server.post('/mfa/totp/setup', mfaTotpSetupHandler)
  server.post('/mfa/totp/enable', mfaTotpEnableHandler)
  server.post('/mfa/totp/disable', mfaTotpDisableHandler)
  server.get('/mfa/backup-codes', mfaBackupCodesHandler)
  server.post('/mfa/backup-codes/regenerate', mfaBackupCodesRegenerateHandler)
  server.post('/passkey/register/begin', passkeyRegisterBeginHandler)
  server.post('/passkey/register/complete', passkeyRegisterCompleteHandler)
  server.post('/passkey/authenticate/begin', passkeyAuthenticateBeginHandler)
  server.post('/passkey/authenticate/complete', passkeyAuthenticateCompleteHandler)
  server.get('/oauth/:provider', oauthBeginHandler)
  server.get('/oauth/:provider/callback', oauthCallbackHandler)
  server.delete('/oauth/:provider', oauthDisconnectHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
