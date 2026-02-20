import type { FastifyPluginAsync } from 'fastify'

import { forgotPasswordHandler } from '../modules/auth/forgot-password'
import {
  magicLinkSendHandler,
  magicLinkVerifyHandler,
} from '../modules/auth/magic-link'
import { mfaVerifyHandler } from '../modules/auth/mfa-verify'
import {
  oauthBeginHandler,
  oauthCallbackHandler,
} from '../modules/oauth/handlers'
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
  server.get('/oauth/:provider', oauthBeginHandler)
  server.get('/oauth/:provider/callback', oauthCallbackHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
