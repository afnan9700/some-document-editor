// src/app/auth/auth.models.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  // refresh token is set as an httpOnly cookie by the backend
}

export interface MeResponse {
  id: number;
  username: string;
}