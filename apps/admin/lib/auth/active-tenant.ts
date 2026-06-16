import { cookies } from "next/headers";
import {
  ACTIVE_TENANT_ID_COOKIE,
  getAuthCookieMaxAgeSeconds,
  isAuthCookieSecure,
} from "@/lib/auth/constants";

export async function getActiveTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_TENANT_ID_COOKIE)?.value ?? null;
}

export function buildActiveTenantCookie(tenantId: string) {
  return {
    name: ACTIVE_TENANT_ID_COOKIE,
    value: tenantId,
    httpOnly: true,
    secure: isAuthCookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: getAuthCookieMaxAgeSeconds(),
  };
}

export function clearActiveTenantCookieOptions() {
  return {
    name: ACTIVE_TENANT_ID_COOKIE,
    value: "",
    httpOnly: true,
    secure: isAuthCookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
