# authkit-cli

AuthKit command-line interface.

## Commands

- `authkit init` runs an interactive setup wizard and scaffolds:
  - `auth.config.ts`
  - `middleware.ts`
  - `.env.local`
  - `app/api/auth/[...authkit]/route.ts`
- `authkit dev` starts the local server in watch mode.
- `authkit db push` runs DB generate + migrate.
- `authkit db migrate` runs pending migrations.
- `authkit keys generate` creates JWT keys + encryption/HMAC secrets in `.env`.
- `authkit keys rotate` creates next JWT key pair values in `.env`.
- `authkit users list` lists users through the management API.
- `authkit users create --email user@example.com [--display-name "User"]` creates a user.
- `authkit init-env` generates secrets and runs DB migrations.
