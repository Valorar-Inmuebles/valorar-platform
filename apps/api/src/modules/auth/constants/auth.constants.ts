export const ACCESS_TOKEN_COOKIE = 'access_token';

export const JWT_ISSUER = 'valorar-api';
export const JWT_AUDIENCE = 'valorar-admin';

export const DEFAULT_JWT_EXPIRES_IN = '8h';
export const DEFAULT_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos';
export const INACTIVE_USER_MESSAGE = 'Tu cuenta está desactivada';
export const FORBIDDEN_ROLE_MESSAGE =
  'No tenés permisos para realizar esta acción';
export const TENANT_REQUIRED_MESSAGE =
  'Seleccioná un tenant (header X-Tenant-Id requerido)';
export const TENANT_NOT_FOUND_MESSAGE = 'Tenant no encontrado';
export const USER_TENANT_MISSING_MESSAGE = 'Usuario sin tenant asignado';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return secret;
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN;
}

export function getCookieMaxAgeMs(): number {
  const raw = process.env.COOKIE_MAX_AGE_MS?.trim();
  if (!raw) {
    return DEFAULT_COOKIE_MAX_AGE_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COOKIE_MAX_AGE_MS;
  }

  return parsed;
}

export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export function getCorsOrigin(): string {
  return process.env.CORS_ORIGIN?.trim() || 'http://localhost:3001';
}
