# @authkit/angular

Angular service, route guard, and HTTP interceptor bindings for AuthKit.

## Quick start

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideRouter } from '@angular/router'
import { authKitInterceptor, provideAuthKit } from '@authkit/angular'

bootstrapApplication(AppComponent, {
  providers: [
    ...provideAuthKit({
      projectId: 'project_123',
      baseUrl: 'http://localhost:3001',
    }),
    provideHttpClient(withInterceptors([authKitInterceptor])),
    provideRouter(routes),
  ],
})
```

Use `authKitGuard()` for protected routes and `AuthKitService` to read auth state.
