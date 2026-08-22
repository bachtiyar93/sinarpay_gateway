export const AUTH_COOKIES = {
  accessToken: "auth_token",
  refreshToken: "refresh_token",
  role: "user_role",
  merchantId: "merchant_id",
  merchantName: "merchant_name",
} as const;

export type UserRole = "MERCHANT" | "OPS" | "ADMIN";

export type AuthUser = {
  id: string;
  role: UserRole;
  merchantId: string;
  merchantName?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: Partial<AuthUser>;
};

type JwtPayload = {
  exp?: number;
  role?: string;
  merchantId?: string;
  sub?: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return atob(padded);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, now = Date.now()) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= now;
}

export function getRoleFromToken(token: string): UserRole | null {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  if (role === "MERCHANT" || role === "OPS" || role === "ADMIN") {
    return role;
  }

  return null;
}
