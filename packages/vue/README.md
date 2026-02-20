# @authkit/vue

Vue 3 composables and provider utilities for AuthKit.

## Quick start

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { createAuthKitPlugin } from '@authkit/vue'

const app = createApp(App)

app.use(
  createAuthKitPlugin({
    config: {
      projectId: 'project_123',
      baseUrl: 'http://localhost:3001',
    },
  }),
)
```

Inside components, call `useAuth()`, `useUser()`, and headless helpers like `useSignIn()`.
