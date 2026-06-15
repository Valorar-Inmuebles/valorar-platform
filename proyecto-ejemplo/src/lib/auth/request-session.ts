import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth/session";
import type { AccessTokenPayload } from "@/lib/auth/types";

export async function getAccessPayloadFromRequest(
  request: NextRequest,
): Promise<AccessTokenPayload | null> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
