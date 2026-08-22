export interface AuthPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
