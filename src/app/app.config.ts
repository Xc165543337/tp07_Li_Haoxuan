import { provideHttpClient, withInterceptors } from '@angular/common/http'
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core'
import { provideRouter } from '@angular/router'
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin'
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin'
import { provideStore } from '@ngxs/store'
import { jwtInterceptor } from './interceptors/jwt.interceptor'
import { AuthState } from './store/auth.state'
import { BookmarkState } from './store/bookmark.state'

import { environment } from '../environments/environment.prod'
import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
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
  ],
}
