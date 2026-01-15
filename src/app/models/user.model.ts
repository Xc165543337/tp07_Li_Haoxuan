export interface User {
  id: number
  nom: string
  prenom: string
  email: string
  nomUtilisateur: string
  dateCreation?: string
  dateModification?: string
}

export interface RegisterUser {
  nom: string
  prenom: string
  email: string
  motDePasse: string
  nomUtilisateur: string
}

export interface AuthTokens {
  accessToken: string
  accessTokenExpiresIn: string
}

/**
 * Login response - refreshToken is NOT included (stored as HttpOnly cookie by backend)
 */
export interface LoginResponse {
  user: User
  accessToken: string
  accessTokenExpiresIn: string
}

export interface RefreshTokenResponse {
  accessToken: string
  accessTokenExpiresIn: string
}
