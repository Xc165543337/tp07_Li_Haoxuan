import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'
import { LoginResponse, RefreshTokenResponse, User } from '../models/user.model'
import { AuthStateService } from './auth-state.service'

export type RegisterResponse = LoginResponse

/**
 * AuthService - Handles authentication with HttpOnly cookie for refresh token
 *
 * SECURITY: Refresh token is stored as HttpOnly cookie by backend.
 * Frontend only stores accessToken in memory.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient)
  private readonly state = inject(AuthStateService)
  private readonly baseUrl = `${environment.apiBaseUrl}/users`

  // Options to include cookies in requests
  private readonly withCredentials = { withCredentials: true }

  login(identifiant: string, motDePasse: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/login`,
      { identifiant, motDePasse },
      this.withCredentials
    )
  }

  register(payload: {
    nom: string
    prenom: string
    email: string
    motDePasse: string
    nomUtilisateur: string
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.baseUrl}/register`,
      payload,
      this.withCredentials
    )
  }

  /**
   * Refresh access token using HttpOnly cookie (sent automatically by browser)
   */
  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(
      `${this.baseUrl}/refresh-token`,
      {}, // Empty body - refresh token is in HttpOnly cookie
      this.withCredentials
    )
  }

  /**
   * Logout - clears HttpOnly cookie on server
   */
  logoutFromServer(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, this.withCredentials)
  }

  setSession(user: User, accessToken: string, accessTokenExpiresIn?: string): void {
    this.state.setUser(user)
    this.state.setAccessToken(accessToken, accessTokenExpiresIn)
  }

  updateAccessToken(accessToken: string, accessTokenExpiresIn?: string): void {
    this.state.setAccessToken(accessToken, accessTokenExpiresIn)
  }

  setSessionUser(user: User | null): void {
    this.state.setUser(user)
  }

  logout(): void {
    this.state.clear()
  }

  getAccessToken(): string | null {
    return this.state.getAccessToken()
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated()
  }
}
