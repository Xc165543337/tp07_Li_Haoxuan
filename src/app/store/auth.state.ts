import { Injectable, inject } from '@angular/core'
import { Action, Selector, State, StateContext } from '@ngxs/store'
import { throwError } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { LoginResponse, User } from '../models/user.model'
import { AuthService } from '../services/auth.service'
import * as AuthActions from './auth.actions'

export interface AuthStateModel {
  accessToken: string | null
  accessTokenExpiresIn: string | null
  user: User | null
  loading: boolean
  error: string | null
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    accessToken: null,
    accessTokenExpiresIn: null,
    user: null,
    loading: false,
    error: null,
  },
})
@Injectable()
export class AuthState {
  private readonly authService = inject(AuthService)

  @Selector()
  static accessToken(state: AuthStateModel): string | null {
    return state.accessToken
  }

  @Selector()
  static user(state: AuthStateModel): User | null {
    return state.user
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return !!state.accessToken && !!state.user
  }

  @Selector()
  static loading(state: AuthStateModel): boolean {
    return state.loading
  }

  @Selector()
  static error(state: AuthStateModel): string | null {
    return state.error
  }

  @Action(AuthActions.Login)
  login(ctx: StateContext<AuthStateModel>, action: AuthActions.Login) {
    ctx.patchState({ loading: true, error: null })

    return this.authService.login(action.identifiant, action.motDePasse).pipe(
      map((response: LoginResponse) => {
        return ctx.dispatch(
          new AuthActions.LoginSuccess(
            response.user,
            response.accessToken,
            response.accessTokenExpiresIn
          )
        )
      }),
      catchError(error => {
        const errorMsg = error?.error?.message || 'Échec de la connexion'
        ctx.dispatch(new AuthActions.LoginFailure(errorMsg))
        return throwError(() => error)
      })
    )
  }

  @Action(AuthActions.LoginSuccess)
  loginSuccess(ctx: StateContext<AuthStateModel>, action: AuthActions.LoginSuccess) {
    // Store access token in AuthStateService for interceptor access
    this.authService.setSession(action.user, action.accessToken, action.accessTokenExpiresIn)

    ctx.patchState({
      accessToken: action.accessToken,
      accessTokenExpiresIn: action.accessTokenExpiresIn,
      user: action.user,
      loading: false,
      error: null,
    })
  }

  @Action(AuthActions.LoginFailure)
  loginFailure(ctx: StateContext<AuthStateModel>, action: AuthActions.LoginFailure) {
    ctx.patchState({
      loading: false,
      error: action.error,
    })
  }

  @Action(AuthActions.Register)
  register(ctx: StateContext<AuthStateModel>, action: AuthActions.Register) {
    ctx.patchState({ loading: true, error: null })

    return this.authService.register(action.payload).pipe(
      map((response: LoginResponse) => {
        return ctx.dispatch(
          new AuthActions.RegisterSuccess(
            response.user,
            response.accessToken,
            response.accessTokenExpiresIn
          )
        )
      }),
      catchError(error => {
        const errorMsg = error?.error?.message || "Échec de l'inscription"
        ctx.dispatch(new AuthActions.RegisterFailure(errorMsg))
        return throwError(() => error)
      })
    )
  }

  @Action(AuthActions.RegisterSuccess)
  registerSuccess(ctx: StateContext<AuthStateModel>, action: AuthActions.RegisterSuccess) {
    // Store access token in AuthStateService for interceptor access
    this.authService.setSession(action.user, action.accessToken, action.accessTokenExpiresIn)

    ctx.patchState({
      accessToken: action.accessToken,
      accessTokenExpiresIn: action.accessTokenExpiresIn,
      user: action.user,
      loading: false,
      error: null,
    })
  }

  @Action(AuthActions.RegisterFailure)
  registerFailure(ctx: StateContext<AuthStateModel>, action: AuthActions.RegisterFailure) {
    ctx.patchState({
      loading: false,
      error: action.error,
    })
  }

  @Action(AuthActions.Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    // Call server to clear HttpOnly cookie, then clear local state
    this.authService.logoutFromServer().subscribe({
      complete: () => {
        this.authService.logout()
      },
      error: () => {
        // Clear local state even if server call fails
        this.authService.logout()
      },
    })

    ctx.setState({
      accessToken: null,
      accessTokenExpiresIn: null,
      user: null,
      loading: false,
      error: null,
    })
  }

  @Action(AuthActions.UpdateProfile)
  updateProfile(ctx: StateContext<AuthStateModel>, action: AuthActions.UpdateProfile) {
    this.authService.setSessionUser(action.user)
    ctx.patchState({
      user: action.user,
    })
  }

  @Action(AuthActions.ClearError)
  clearError(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({ error: null })
  }

  @Action(AuthActions.RefreshToken)
  refreshToken(ctx: StateContext<AuthStateModel>) {
    return this.authService.refreshToken().pipe(
      map(response => {
        return ctx.dispatch(
          new AuthActions.RefreshTokenSuccess(response.accessToken, response.accessTokenExpiresIn)
        )
      }),
      catchError(error => {
        const errorMsg = error?.error?.message || 'Session expirée'
        ctx.dispatch(new AuthActions.RefreshTokenFailure(errorMsg))
        // Logout on refresh failure
        ctx.dispatch(new AuthActions.Logout())
        return throwError(() => error)
      })
    )
  }

  @Action(AuthActions.RefreshTokenSuccess)
  refreshTokenSuccess(ctx: StateContext<AuthStateModel>, action: AuthActions.RefreshTokenSuccess) {
    this.authService.updateAccessToken(action.accessToken, action.accessTokenExpiresIn)
    ctx.patchState({
      accessToken: action.accessToken,
      accessTokenExpiresIn: action.accessTokenExpiresIn,
    })
  }

  @Action(AuthActions.RefreshTokenFailure)
  refreshTokenFailure(ctx: StateContext<AuthStateModel>, action: AuthActions.RefreshTokenFailure) {
    ctx.patchState({
      error: action.error,
    })
  }
}
