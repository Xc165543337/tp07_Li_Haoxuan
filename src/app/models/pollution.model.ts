import { User } from './user.model'

export const POLLUTION_TYPES = [
  'Plastique',
  'Chimique',
  'Dépôt sauvage',
  'Eau',
  'Air',
  'Autre',
] as const

export const POLLUTION_LEVELS = ['Faible', 'Moyen', 'Élevé'] as const

export type PollutionLevel = (typeof POLLUTION_LEVELS)[number]
export type PollutionType = (typeof POLLUTION_TYPES)[number]

/**
 * Location can be provided as:
 * - GPS coordinates (latitude + longitude)
 * - Text address (adresse)
 * - Both (for better accuracy)
 *
 * At least one must be provided.
 */
export type LocationType = 'gps' | 'address' | 'both'

/**
 * Photo can be:
 * - A URL pointing to an external image
 * - A file path to an uploaded image on the server
 */
export type PhotoSourceType = 'url' | 'upload'

/**
 * Base pollution declaration interface (for creation/update payloads)
 */
export interface PollutionDeclarationBase {
  titre: string
  type: PollutionType
  description: string
  dateObservation: string
  niveau: PollutionLevel

  // Location: GPS coordinates OR address (at least one required)
  adresse?: string | null
  latitude?: number | null
  longitude?: number | null

  // Photo: URL or uploaded file path
  photoUrl?: string | null
}

/**
 * Full pollution declaration with ID (from API responses)
 */
export interface PollutionDeclaration extends PollutionDeclarationBase {
  id: number
  utilisateurId?: number

  // User info included in API responses
  utilisateur?: Pick<User, 'id' | 'nom' | 'prenom' | 'nomUtilisateur'>

  // Timestamps from backend
  createdAt?: string
  updatedAt?: string
}

/**
 * Payload for creating a new pollution declaration
 */
export type CreatePollutionPayload = PollutionDeclarationBase

/**
 * Payload for updating an existing pollution declaration
 */
export type UpdatePollutionPayload = Partial<PollutionDeclarationBase>

export interface PollutionStats {
  totalDeclarations: number
  declarationsByType: Record<PollutionType, number>
  declarationsBySeverity: Record<PollutionLevel, number>
}

export interface PollutionFilter {
  type?: PollutionType
  niveau?: PollutionLevel
  dateFrom?: string
  dateTo?: string
  utilisateurId?: number
}

/**
 * Helper to check if a pollution has valid location data
 */
export function hasValidLocation(pollution: PollutionDeclarationBase): boolean {
  const hasGps =
    pollution.latitude != null &&
    pollution.longitude != null &&
    !isNaN(pollution.latitude) &&
    !isNaN(pollution.longitude)
  const hasAddress = !!pollution.adresse?.trim()
  return hasGps || hasAddress
}

/**
 * Helper to determine location type
 */
export function getLocationType(pollution: PollutionDeclarationBase): LocationType | null {
  const hasGps =
    pollution.latitude != null &&
    pollution.longitude != null &&
    !isNaN(pollution.latitude) &&
    !isNaN(pollution.longitude)
  const hasAddress = !!pollution.adresse?.trim()

  if (hasGps && hasAddress) return 'both'
  if (hasGps) return 'gps'
  if (hasAddress) return 'address'
  return null
}
