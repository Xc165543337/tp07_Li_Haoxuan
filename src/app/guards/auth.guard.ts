import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { Store } from '@ngxs/store'
import { AuthState } from '../store/auth.state'

export const authGuard: CanActivateFn = () => {
  const store = inject(Store)
  const router = inject(Router)

  const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated)
  const accessToken = store.selectSnapshot(AuthState.accessToken)

  // Check if user is authenticated and has a valid access token
  if (!isAuthenticated || !accessToken) {
    router.navigate(['/login'])
    return false
  }

  // Optional: Check if token is expired (basic check)
  if (isTokenExpired(accessToken)) {
    // Token is expired, redirect to login
    // The interceptor will handle refresh if needed on the next API call
    router.navigate(['/login'])
    return false
  }

  return true
}

export const homeGuard: CanActivateFn = () => {
  const store = inject(Store)
  const router = inject(Router)

  const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated)

  if (isAuthenticated) {
    router.navigate(['/pollutions'])
    return false
  }

  return true
}

/**
 * Basic JWT token expiration check
 * Decodes the token payload and checks the exp claim
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convert to milliseconds

    // Add a small buffer (30 seconds) to account for network latency
    return Date.now() >= exp - 30000
  } catch {
    // If we can't decode the token, consider it invalid
    return true
  }
}
