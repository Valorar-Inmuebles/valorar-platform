import { cookies } from "next/headers";

import { getAccessTtlSeconds, getRefreshTtlSeconds } from "@/lib/auth/config";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: getAccessTtlSeconds(),
  });

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: getRefreshTtlSeconds(),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value;
}
