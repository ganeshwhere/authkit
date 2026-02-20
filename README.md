# AuthKit

Developer-first, self-hostable authentication platform and SDK suite.

## Workspace Layout

- `app/server`: Fastify auth server
- `app/dashboard`: Next.js developer dashboard
- `packages/*`: JavaScript/TypeScript SDKs and adapters
- `sdks/*`: Python and Go SDKs
- `docker/*`: Deployment assets
- `docs/*`: MDX documentation

## Quick Start

1. Use Node.js `20.x` and `pnpm 8+`.
2. Install dependencies: `pnpm install`.
3. Run workspace tasks via Turbo: `pnpm build`, `pnpm test`.
