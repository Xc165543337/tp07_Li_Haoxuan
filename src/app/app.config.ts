import { provideHttpClient, withInterceptors } from '@angular/common/http'
import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core'
import { provideRouter, withComponentInputBinding } from '@angular/router'
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin'
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin'
import { provideStore } from '@ngxs/store'
import { jwtInterceptor } from './interceptors/jwt.interceptor'
import { AuthInitService } from './services/auth-init.service'
import { AuthState } from './store/auth.state'
import { BookmarkState } from './store/bookmark.state'

import { environment } from '../environments/environment.prod'
import { routes } from './app.routes'

/**
 * Initialize authentication on app startup.
 * Attempts to restore session using HttpOnly refresh token cookie.
 */
function initializeAuth(): () => Promise<void> {
  const authInitService = inject(AuthInitService)
  return () => authInitService.initializeAuth()
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Enable route params as component input signals
    provideRouter(routes, withComponentInputBinding()),
    // Register HttpClient with JWT interceptor
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // Configure NGXS store with AuthState and BookmarkState
    // NOTE: Only bookmarks are persisted. Auth tokens are kept in memory only for security.
    provideStore(
      [AuthState, BookmarkState],
      withNgxsStoragePlugin({
        keys: ['bookmarks'], // Only persist bookmarks, NOT auth tokens (security best practice)
      }),
      withNgxsReduxDevtoolsPlugin({
        disabled: environment.production,
      })
    ),
    // Initialize auth on app startup - restore session from refresh token cookie
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
}
