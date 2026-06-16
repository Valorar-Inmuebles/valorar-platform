import { getAccessTokenFromCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/session";
import type { AccessTokenPayload } from "@/lib/auth/types";

export async function getAccessPayloadFromCookies(): Promise<AccessTokenPayload | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  return verifyAccessToken(token);
}
