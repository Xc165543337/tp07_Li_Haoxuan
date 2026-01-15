import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, throwError } from 'rxjs'
import { environment } from '../../environments/environment'
import { User } from '../models/user.model'

/**
 * UserService - Handles user-related API operations
 *
 * Modern practices:
 * - inject() function for DI
 * - HttpParams for query parameters
 * - Centralized error handling
 * - Typed responses
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = `${environment.apiBaseUrl}/users`

  /**
   * Get all users, optionally filtered by search query
   */
  getAll(search?: string): Observable<User[]> {
    let params = new HttpParams()
    if (search?.trim()) {
      params = params.set('q', search.trim())
    }
    return this.http
      .get<User[]>(this.baseUrl, { params })
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Get a single user by ID
   */
  getById(id: number): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/${id}`)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Update user profile
   */
  update(id: number, payload: Partial<Omit<User, 'id'>>): Observable<User> {
    return this.http
      .put<User>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Delete a user (admin only)
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`${this.baseUrl}/${id}`)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Centralized error handling
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = error.error?.message || `Error ${error.status}: ${error.statusText}`
    console.error('[UserService]', message, error)
    return throwError(() => ({ status: error.status, message, originalError: error }))
  }
}
