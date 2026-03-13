import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { useMFA, useSignIn, useSignUp } from './headless'
import { useAuth, useAuthKit, useUser } from './hooks'

export function SignIn(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  const { signIn, isLoading, error } = useSignIn()
  const { verify, isLoading: mfaLoading, error: mfaError } = useMFA()

  const activeError = mfaToken ? mfaError : error

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (mfaToken) {
      await verify(mfaToken, mfaCode)
      setMfaToken(null)
      setMfaCode('')
      return
    }

    const result = await signIn(email, password)

    if ('mfaRequired' in result && result.mfaRequired) {
      setMfaToken(result.mfaToken)
      setMfaCode('')
    }
  }

  return (
    <form onSubmit={submit}>
      {!mfaToken ? (
        <>
          <label>
            Email
            <input
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
        </>
      ) : (
        <label>
          MFA code
          <input
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            type="text"
            required
          />
        </label>
      )}

      <button disabled={isLoading || mfaLoading} type="submit">
        {mfaToken ? 'Verify code' : 'Sign in'}
      </button>

      {activeError ? <p role="alert">{activeError.message}</p> : null}
    </form>
  )
}

export function SignUp(): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const { signUp, isLoading, error } = useSignUp()

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await signUp(email, password, displayName || undefined)
  }

  return (
    <form onSubmit={submit}>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          type="text"
        />
      </label>
      <label>
        Email
        <input
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </label>
      <label>
        Password
        <input
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </label>

      <button disabled={isLoading} type="submit">
        Sign up
      </button>

      {error ? <p role="alert">{error.message}</p> : null}
    </form>
  )
}

export function UserButton(): JSX.Element | null {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const initials = useMemo(() => {
    if (!user) {
      return ''
    }

    const source = user.displayName || user.email
    return source
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2)
  }, [user])

  if (!user) {
    return null
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt={user.email} /> : <span>{initials}</span>}
      </button>

      {open ? (
        <div>
          <p>{user.email}</p>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              setOpen(false)
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function UserProfile(): JSX.Element {
  const { user, update, isLoaded } = useUser()
  const { client } = useAuthKit()
  const { signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(user?.displayName ?? '')
    setAvatarUrl(user?.avatarUrl ?? '')
  }, [user])

  if (!isLoaded) {
    return <p>Loading profile...</p>
  }

  if (!user) {
    return <p>You are not signed in.</p>
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    await update(
      avatarUrl
        ? {
            displayName,
            avatarUrl,
          }
        : {
            displayName,
          },
    )

    setMessage('Profile updated.')
  }

  return (
    <section>
      <h2>Profile</h2>
      <p>{user.email}</p>

      <form onSubmit={save}>
        <label>
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            type="text"
          />
        </label>

        <label>
          Avatar URL
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            type="url"
          />
        </label>

        <button type="submit">Save</button>
      </form>

      {message ? <p>{message}</p> : null}

      <button
        type="button"
        onClick={async () => {
          await client.deleteAccount()
          await signOut()
        }}
      >
        Delete account
      </button>
    </section>
  )
}
