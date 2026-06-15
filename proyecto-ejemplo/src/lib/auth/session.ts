import { SignJWT, jwtVerify } from "jose";

import {
  getAccessTtlSeconds,
  getAnsesJobsSecret,
  getAuthSecret,
} from "@/lib/auth/config";
import type { AccessTokenPayload } from "@/lib/auth/types";

export const ACCESS_COOKIE = "jx_access";
export const REFRESH_COOKIE = "jx_refresh";

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  const secret = encodeSecret(getAuthSecret());

  return new SignJWT({ sid: payload.sid, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${getAccessTtlSeconds()}s`)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const secret = encodeSecret(getAuthSecret());
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const sid = payload.sid;
    const email = payload.email;

    if (!sub || typeof sid !== "string") {
      return null;
    }

    return {
      sub,
      sid,
      email: typeof email === "string" ? email : "",
    };
  } catch {
    return null;
  }
}

/** Token bearer para servicios externos (p. ej. jobs ANSES). */
export async function signServiceToken(userId: string): Promise<string> {
  const secret = encodeSecret(getAnsesJobsSecret());

  return new SignJWT({ purpose: "anses-jobs" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}
