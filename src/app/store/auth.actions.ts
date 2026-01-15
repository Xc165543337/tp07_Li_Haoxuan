import { User } from '../models/user.model'

// Auth Actions
export class Login {
  static readonly type = '[Auth] Login'
  constructor(
    public identifiant: string,
    public motDePasse: string
  ) {}
}

export class LoginSuccess {
  static readonly type = '[Auth] Login Success'
  constructor(
    public user: User,
    public accessToken: string,
    public accessTokenExpiresIn: string
  ) {}
}

export class LoginFailure {
  static readonly type = '[Auth] Login Failure'
  constructor(public error: string) {}
}

export class Register {
  static readonly type = '[Auth] Register'
  constructor(
    public payload: {
      nom: string
      prenom: string
      email: string
      motDePasse: string
      nomUtilisateur: string
    }
  ) {}
}

export class RegisterSuccess {
  static readonly type = '[Auth] Register Success'
  constructor(
    public user: User,
    public accessToken: string,
    public accessTokenExpiresIn: string
  ) {}
}

export class RegisterFailure {
  static readonly type = '[Auth] Register Failure'
  constructor(public error: string) {}
}

export class Logout {
  static readonly type = '[Auth] Logout'
}

export class UpdateProfile {
  static readonly type = '[Auth] Update Profile'
  constructor(public user: User) {}
}

export class ClearError {
  static readonly type = '[Auth] Clear Error'
}

export class RefreshToken {
  static readonly type = '[Auth] Refresh Token'
}

export class RefreshTokenSuccess {
  static readonly type = '[Auth] Refresh Token Success'
  constructor(
    public accessToken: string,
    public accessTokenExpiresIn: string
  ) {}
}

export class RefreshTokenFailure {
  static readonly type = '[Auth] Refresh Token Failure'
  constructor(public error: string) {}
}

// Export all as AuthActions namespace for convenience
export const AuthActions = {
  Login,
  LoginSuccess,
  LoginFailure,
  Register,
  RegisterSuccess,
  RegisterFailure,
  Logout,
  UpdateProfile,
  ClearError,
  RefreshToken,
  RefreshTokenSuccess,
  RefreshTokenFailure,
}
