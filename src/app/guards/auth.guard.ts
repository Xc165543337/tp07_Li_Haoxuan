import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { Store } from '@ngxs/store'
import { ToastService } from '../services/toast.service'
import { AuthState } from '../store/auth.state'

/**
 * Auth Guard - Protects routes that require authentication
 *
 * Checks:
 * 1. User is authenticated (has valid session)
 * 2. Access token exists and is not expired
 *
 * If token is expired, redirects to login.
 * The JWT interceptor will handle refresh on API calls.
 */
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

  // Check if token is expired
  if (isTokenExpired(accessToken)) {
    // Token is expired, redirect to login
    // The APP_INITIALIZER should have refreshed the token on startup
    // If we get here, the refresh also failed
    router.navigate(['/login'])
    return false
  }

  return true
}

/**
 * Home Guard - Redirects authenticated users away from home/login
 */
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
 * JWT token expiration check
 *
 * Decodes the token payload and checks the exp claim.
 * Adds a 30-second buffer to account for network latency.
 *
 * @param token - JWT access token
 * @returns true if token is expired or invalid
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return true // Invalid JWT format
    }

    // Decode base64url payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

    // Check expiration claim
    if (!payload.exp) {
      return true // No expiration claim
    }

    const expMs = payload.exp * 1000 // Convert to milliseconds
    const bufferMs = 30000 // 30 second buffer

    return Date.now() >= expMs - bufferMs
  } catch {
    // If we can't decode the token, consider it invalid
    return true
  }
}

/**
 * Admin Guard - Protects admin-only routes
 *
 * Checks if user has admin role.
 * Must be used after authGuard.
 */
export const adminGuard: CanActivateFn = () => {
  const store = inject(Store)
  const router = inject(Router)
  const toast = inject(ToastService)

  const user = store.selectSnapshot(AuthState.user)

  if (!user?.role || user.role !== 'admin') {
    toast.error('Accès réservé aux administrateurs')
    router.navigate(['/pollutions'])
    return false
  }

  return true
}
