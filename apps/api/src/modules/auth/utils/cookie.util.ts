import type { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  getCookieMaxAgeMs,
  isCookieSecure,
} from '../constants/auth.constants';

export function setAccessTokenCookie(response: Response, token: string): void {
  response.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: getCookieMaxAgeMs(),
  });
}

export function clearAccessTokenCookie(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'lax',
    path: '/',
  });
}
