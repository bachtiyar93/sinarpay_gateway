import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete(AUTH_COOKIES.accessToken);
  response.cookies.delete(AUTH_COOKIES.refreshToken);
  response.cookies.delete(AUTH_COOKIES.role);
  response.cookies.delete(AUTH_COOKIES.merchantId);
  response.cookies.delete(AUTH_COOKIES.merchantName);

  return response;
}
