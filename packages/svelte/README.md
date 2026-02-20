# @authkit/svelte

Svelte store utilities for AuthKit.

## Quick start

```ts
import { createAuthKitStore } from '@authkit/svelte'

export const auth = createAuthKitStore({
  config: {
    projectId: 'project_123',
    baseUrl: 'http://localhost:3001',
  },
})

await auth.initialize()
```

Use `auth.user`, `auth.session`, and helper factories like `createSignInActions(auth)` in your app.
