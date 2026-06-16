export const ACCESS_TOKEN_COOKIE = "access_token";
export const ACTIVE_TENANT_ID_COOKIE = "active_tenant_id";

export const DEFAULT_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export function isAuthCookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAuthCookieMaxAgeSeconds(): number {
  return DEFAULT_COOKIE_MAX_AGE_SECONDS;
}
