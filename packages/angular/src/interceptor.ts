import type {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http'
import { inject } from '@angular/core'
import {
  from,
  switchMap,
  type Observable,
} from 'rxjs'

import { AuthKitService } from './service'

export function withBearerToken(
  request: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
  if (!accessToken) {
    return request
  }

  return request.clone({
    setHeaders: {
      authorization: `Bearer ${accessToken}`,
    },
  })
}

export const authKitInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const service = inject(AuthKitService)

  return from(service.getToken()).pipe(
    switchMap((token) => {
      const authenticatedRequest = withBearerToken(request, token)
      return next(authenticatedRequest)
    }),
  )
}
