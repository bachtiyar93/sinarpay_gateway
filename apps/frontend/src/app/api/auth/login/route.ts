import { NextResponse } from "next/server";
import { AUTH_COOKIES, decodeJwtPayload, type LoginResponse } from "@/lib/auth";

type LoginRequest = {
  email: string;
  password: string;
};

function backendUrl() {
  return process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ message: "Payload login tidak valid" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Backend tidak tersedia saat ini. Coba beberapa saat lagi." }, { status: 503 });
  }

  let errorBody: { message?: string } | null = null;
  try {
    errorBody = (await response.clone().json()) as { message?: string };
  } catch {
    errorBody = null;
  }

  if (!response.ok) {
    const message = typeof errorBody?.message === "string" ? errorBody.message : "Login failed";
    return NextResponse.json({ message }, { status: response.status });
  }

  let data: LoginResponse;
  try {
    data = (await response.json()) as LoginResponse;
  } catch {
    return NextResponse.json({ message: "Respons backend login kosong atau tidak valid" }, { status: 502 });
  }

  const tokenPayload = data.accessToken ? decodeJwtPayload(data.accessToken) : null;
  const decodedRole =
    tokenPayload?.role === "MERCHANT" || tokenPayload?.role === "OPS" || tokenPayload?.role === "ADMIN"
      ? tokenPayload.role
      : null;
  const resolvedUserId = data.user?.id ?? tokenPayload?.sub ?? null;
  const resolvedRole = data.user?.role ?? decodedRole;

  if (!resolvedUserId || !resolvedRole) {
    return NextResponse.json({ message: "Respons login backend tidak menyediakan identitas user yang valid" }, { status: 502 });
  }

  const merchantId = data.user?.merchantId ?? resolvedUserId;
  const merchantName = data.user?.merchantName ?? merchantId;

  const jsonResponse = NextResponse.json({
    user: {
      id: resolvedUserId,
      role: resolvedRole,
      merchantId,
      merchantName,
    },
  });

  jsonResponse.cookies.set(AUTH_COOKIES.accessToken, data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });

  if (data.refreshToken) {
    jsonResponse.cookies.set(AUTH_COOKIES.refreshToken, data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  jsonResponse.cookies.set(AUTH_COOKIES.role, resolvedRole, {
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });
  jsonResponse.cookies.set(AUTH_COOKIES.merchantId, merchantId, {
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });
  jsonResponse.cookies.set(AUTH_COOKIES.merchantName, merchantName, {
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });

  return jsonResponse;
}
