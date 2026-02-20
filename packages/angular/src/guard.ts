import {
  inject,
  type Provider,
} from '@angular/core'
import type {
  CanActivateFn,
  UrlTree,
} from '@angular/router'
import { Router } from '@angular/router'
import type { AuthKitConfig } from '@authkit/core'

import {
  AUTHKIT_CLIENT,
  AuthKitService,
  createAuthKitClient,
} from './service'

export type AuthKitGuardOptions = {
  redirectTo?: string
}

export function provideAuthKit(config: AuthKitConfig): Provider[] {
  return [
    {
      provide: AUTHKIT_CLIENT,
      useValue: createAuthKitClient(config),
    },
    AuthKitService,
  ]
}

export function authKitGuard(options: AuthKitGuardOptions = {}): CanActivateFn {
  return async (): Promise<boolean | UrlTree> => {
    const service = inject(AuthKitService)
    const router = inject(Router)

    const token = await service.getToken()

    if (token) {
      return true
    }

    return router.createUrlTree([options.redirectTo ?? '/sign-in'])
  }
}
