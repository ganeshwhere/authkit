import type { FastifyPluginAsync } from 'fastify'

import { forgotPasswordHandler } from '../modules/auth/forgot-password'
import { refreshHandler } from '../modules/auth/refresh'
import { resetPasswordHandler } from '../modules/auth/reset-password'
import { signinHandler } from '../modules/auth/signin'
import { signoutHandler } from '../modules/auth/signout'
import { signupHandler } from '../modules/auth/signup'

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/signup', signupHandler)
  server.post('/signin', signinHandler)
  server.post('/signout', signoutHandler)
  server.post('/refresh', refreshHandler)
  server.post('/forgot-password', forgotPasswordHandler)
  server.post('/reset-password', resetPasswordHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
