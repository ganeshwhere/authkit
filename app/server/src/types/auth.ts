export type AccessTokenPayload = {
  sub: string
  sid: string
  pid: string
  email: string
  emailVerified: boolean
  iat: number
  exp: number
  iss: string
}
