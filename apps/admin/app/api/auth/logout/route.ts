import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import {
  ACCESS_TOKEN_COOKIE,
  isAuthCookieSecure,
} from "@/lib/auth/constants";
import { clearActiveTenantCookieOptions } from "@/lib/auth/active-tenant";

export async function POST() {
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
  } catch {
    // Best effort — la cookie del admin se limpia igual.
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    secure: isAuthCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(clearActiveTenantCookieOptions());

  return response;
}
