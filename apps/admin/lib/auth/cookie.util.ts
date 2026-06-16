const ACCESS_TOKEN_PATTERN = /(?:^|,\s*)access_token=([^;]+)/i;

export function parseAccessTokenFromSetCookie(
  setCookieHeader: string | null,
): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const match = ACCESS_TOKEN_PATTERN.exec(setCookieHeader);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}
