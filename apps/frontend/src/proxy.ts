import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, getRoleFromToken, isJwtExpired } from "@/lib/auth";

const PROTECTED_PATHS = ["/dashboard", "/transactions", "/payment-generator", "/settings"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(AUTH_COOKIES.accessToken);
  response.cookies.delete(AUTH_COOKIES.refreshToken);
  response.cookies.delete(AUTH_COOKIES.role);
  response.cookies.delete(AUTH_COOKIES.merchantId);
  response.cookies.delete(AUTH_COOKIES.merchantName);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIES.accessToken)?.value;

  if (pathname === "/login") {
    if (token && !isJwtExpired(token)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname)) {
    if (!token || isJwtExpired(token)) {
      return redirectToLogin(request);
    }

    const role = getRoleFromToken(token) ?? request.cookies.get(AUTH_COOKIES.role)?.value;
    if (role !== "MERCHANT" && role !== "OPS" && role !== "ADMIN") {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/transactions/:path*", "/payment-generator/:path*", "/settings/:path*"],
};
