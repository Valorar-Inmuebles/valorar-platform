const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_ACCESS_TTL_MINUTES = 30 * MINUTES_PER_DAY;
const DEFAULT_REFRESH_TTL_MINUTES = 30 * MINUTES_PER_DAY;
const DEFAULT_RESET_TTL_MINUTES = 60;

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 64) {
    throw new Error("AUTH_SECRET debe tener al menos 64 caracteres");
  }
  return secret;
}

function parseAuthTtlMinutes(
  envKey: string,
  defaultMinutes: number,
): number {
  const minutes = Number.parseInt(process.env[envKey] ?? "", 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes;
}

export function getAccessTtlMinutes(): number {
  return parseAuthTtlMinutes(
    "AUTH_ACCESS_TTL_MINUTES",
    DEFAULT_ACCESS_TTL_MINUTES,
  );
}

export function getAccessTtlSeconds(): number {
  return getAccessTtlMinutes() * 60;
}

export function getRefreshTtlMinutes(): number {
  return parseAuthTtlMinutes(
    "AUTH_REFRESH_TTL_MINUTES",
    DEFAULT_REFRESH_TTL_MINUTES,
  );
}

export function getRefreshTtlSeconds(): number {
  return getRefreshTtlMinutes() * 60;
}

export function getResetTtlMinutes(): number {
  return parseAuthTtlMinutes("AUTH_RESET_TTL_MINUTES", DEFAULT_RESET_TTL_MINUTES);
}

export function getAnsesJobsSecret(): string {
  return process.env.ANSES_JOBS_SECRET?.trim() || getAuthSecret();
}
