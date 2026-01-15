import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { Store } from '@ngxs/store'
import { BehaviorSubject, Observable, throwError } from 'rxjs'
import { catchError, filter, switchMap, take } from 'rxjs/operators'
import { AuthService } from '../services/auth.service'
import { Logout } from '../store/auth.actions'
import { AuthState } from '../store/auth.state'

// Flag to prevent multiple refresh requests
let isRefreshing = false
const refreshTokenSubject = new BehaviorSubject<string | null>(null)

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService)
  const store = inject(Store)
  const router = inject(Router)

  // Skip auth for login, register, refresh-token, and logout endpoints
  const skipUrls = ['/login', '/register', '/refresh-token', '/logout']
  const shouldSkip = skipUrls.some(url => req.url.includes(url))

  if (shouldSkip) {
    return next(req)
  }

  const accessToken = store.selectSnapshot(AuthState.accessToken)

  if (accessToken) {
    req = addTokenToRequest(req, accessToken)
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - try to refresh token using HttpOnly cookie
      if (error.status === 401 && !shouldSkip) {
        return handle401Error(req, next, authService, store, router)
      }
      return throwError(() => error)
    })
  )
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  })
}

/**
 * Handle 401 errors by attempting to refresh the access token.
 * Refresh token is sent automatically via HttpOnly cookie.
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  store: Store,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true
    refreshTokenSubject.next(null)

    // Attempt to refresh - cookie is sent automatically
    return authService.refreshToken().pipe(
      switchMap(response => {
        isRefreshing = false

        // Update the access token in the service
        authService.updateAccessToken(response.accessToken, response.accessTokenExpiresIn)

        refreshTokenSubject.next(response.accessToken)

        // Retry the original request with the new token
        return next(addTokenToRequest(req, response.accessToken))
      }),
      catchError(err => {
        isRefreshing = false

        // Refresh failed - logout and redirect to login
        store.dispatch(new Logout())
        router.navigate(['/login'])

        return throwError(() => err)
      })
    )
  }

  // Wait for token refresh to complete
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(addTokenToRequest(req, token)))
  )
}
