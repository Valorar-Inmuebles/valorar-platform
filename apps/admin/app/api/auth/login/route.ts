import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import {
  ACCESS_TOKEN_COOKIE,
  getAuthCookieMaxAgeSeconds,
  isAuthCookieSecure,
} from "@/lib/auth/constants";
import { parseAccessTokenFromSetCookie } from "@/lib/auth/cookie.util";
import type { AuthUser } from "@/lib/auth/types";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { message: "Cuerpo de solicitud inválido." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email y contraseña son obligatorios." },
      { status: 400 },
    );
  }

  const apiResponse = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!apiResponse.ok) {
    let errorBody: unknown = null;

    try {
      errorBody = await apiResponse.json();
    } catch {
      errorBody = null;
    }

    return NextResponse.json(errorBody ?? { message: "Credenciales inválidas." }, {
      status: apiResponse.status,
    });
  }

  const user = (await apiResponse.json()) as AuthUser;
  const setCookieParts =
    typeof apiResponse.headers.getSetCookie === "function"
      ? apiResponse.headers.getSetCookie()
      : [];
  const setCookieHeader =
    setCookieParts.length > 0
      ? setCookieParts.join("; ")
      : apiResponse.headers.get("set-cookie");
  const token = parseAccessTokenFromSetCookie(setCookieHeader);

  if (!token) {
    return NextResponse.json(
      { message: "No se recibió token de autenticación desde la API." },
      { status: 502 },
    );
  }

  const response = NextResponse.json(user);
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: isAuthCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: getAuthCookieMaxAgeSeconds(),
  });

  return response;
}
