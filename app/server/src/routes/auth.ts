import type { FastifyPluginAsync } from 'fastify'

import { signinHandler } from '../modules/auth/signin'
import { signoutHandler } from '../modules/auth/signout'
import { signupHandler } from '../modules/auth/signup'

const authRoutes: FastifyPluginAsync = async (server) => {
  server.post('/signup', signupHandler)
  server.post('/signin', signinHandler)
  server.post('/signout', signoutHandler)
  server.get('/_status', async () => ({ data: { ok: true }, error: null }))
}

export default authRoutes
