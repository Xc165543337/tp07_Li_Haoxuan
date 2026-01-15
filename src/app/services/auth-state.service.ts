import { Injectable, signal } from '@angular/core'
import { User } from '../models/user.model'

/**
 * AuthStateService - Memory-only token storage
 *
 * SECURITY:
 * - Access token: stored in memory only (not localStorage)
 * - Refresh token: stored as HttpOnly cookie by backend (not accessible via JS)
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _user = signal<User | null>(null)
  private readonly _accessToken = signal<string | null>(null)
  private readonly _accessTokenExpiresAt = signal<Date | null>(null)

  user = this._user.asReadonly()
  accessToken = this._accessToken.asReadonly()
  accessTokenExpiresAt = this._accessTokenExpiresAt.asReadonly()

  setUser(user: User | null): void {
    this._user.set(user)
  }

  setAccessToken(token: string | null, expiresIn?: string): void {
    this._accessToken.set(token)
    if (token && expiresIn) {
      this._accessTokenExpiresAt.set(this.calculateExpiryDate(expiresIn))
    } else {
      this._accessTokenExpiresAt.set(null)
    }
  }

  clear(): void {
    this._user.set(null)
    this._accessToken.set(null)
    this._accessTokenExpiresAt.set(null)
  }

  isAuthenticated(): boolean {
    return !!this._user() && !!this._accessToken()
  }

  isAccessTokenExpired(): boolean {
    const expiresAt = this._accessTokenExpiresAt()
    if (!expiresAt) return true
    return new Date() >= expiresAt
  }

  getAccessToken(): string | null {
    return this._accessToken()
  }

  /**
   * Parse duration strings like "15m", "7d", "1h" to calculate expiry date
   */
  private calculateExpiryDate(duration: string): Date {
    const now = new Date()
    const regex = /^(\d+)([smhd])$/
    const match = regex.exec(duration)

    if (!match) {
      // Default to 15 minutes if parsing fails
      return new Date(now.getTime() + 15 * 60 * 1000)
    }

    const value = Number.parseInt(match[1], 10)
    const unit = match[2]

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000)
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000)
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000)
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() + 15 * 60 * 1000)
    }
  }
}
