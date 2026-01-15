import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, throwError } from 'rxjs'
import { environment } from '../../environments/environment'
import {
  CreatePollutionPayload,
  PollutionDeclaration,
  PollutionFilter,
  UpdatePollutionPayload,
} from '../models/pollution.model'

/**
 * Service for managing pollution declarations.
 *
 * Modern practices used:
 * - inject() function instead of constructor injection
 * - Typed payloads for create/update operations
 * - Proper error handling with typed errors
 * - Optional query parameters with HttpParams
 */
@Injectable({
  providedIn: 'root',
})
export class PollutionService {
  private readonly http = inject(HttpClient)
  private readonly baseUrl = `${environment.apiBaseUrl}/pollution`

  /**
   * Get all pollution declarations with optional filters
   */
  getAll(filters?: PollutionFilter): Observable<PollutionDeclaration[]> {
    let params = new HttpParams()

    if (filters?.type) {
      params = params.set('type', filters.type)
    }
    if (filters?.niveau) {
      params = params.set('niveau', filters.niveau)
    }
    if (filters?.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom)
    }
    if (filters?.dateTo) {
      params = params.set('dateTo', filters.dateTo)
    }

    return this.http
      .get<PollutionDeclaration[]>(this.baseUrl, { params })
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Get pollution declarations created by the current user
   */
  getMyPollutions(): Observable<PollutionDeclaration[]> {
    return this.http
      .get<PollutionDeclaration[]>(`${this.baseUrl}/user/me`)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Get a single pollution declaration by ID
   */
  getById(id: number): Observable<PollutionDeclaration> {
    return this.http
      .get<PollutionDeclaration>(`${this.baseUrl}/${id}`)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Create a new pollution declaration
   */
  create(payload: CreatePollutionPayload): Observable<PollutionDeclaration> {
    return this.http
      .post<PollutionDeclaration>(this.baseUrl, payload)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Update an existing pollution declaration
   * Note: Users can only update their own declarations (enforced by backend)
   */
  update(id: number, payload: UpdatePollutionPayload): Observable<PollutionDeclaration> {
    return this.http
      .put<PollutionDeclaration>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Delete a pollution declaration
   * Note: Users can only delete their own declarations (enforced by backend)
   */
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Upload a photo for a pollution declaration
   * Returns the URL/path of the uploaded file
   */
  uploadPhoto(file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData()
    formData.append('photo', file)

    return this.http
      .post<{ photoUrl: string }>(`${this.baseUrl}/upload-photo`, formData)
      .pipe(catchError(err => this.handleError(err)))
  }

  /**
   * Centralized error handling with typed error response
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Erreur API pollution'

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      message = `Erreur: ${error.error.message}`
    } else {
      // Server-side error
      message = error.error?.message || `Erreur ${error.status}: ${error.statusText}`
    }

    console.error('[PollutionService]', message, error)

    return throwError(() => ({
      status: error.status,
      message,
      originalError: error,
    }))
  }
}
