/**
 * Regex for personal names (persona humana).
 * Supports: accented chars, Unicode letters, combining marks, apostrophes,
 * typographic single quotes, hyphens, and spaces. No digits.
 * Valid: José, João, D'Nardo, O'Connor, Jean-Pierre, Müller.
 */
export const PERSON_NAME_REGEX = /^[\p{L}\p{M}'\u2019\-\s]+$/u;

/**
 * Regex for company names (persona jurídica / razón social).
 * Extends PERSON_NAME_REGEX with digits, dot, ampersand, slash, parentheses.
 * Valid: Acme S.A., Smith & Co., Grupo 3/15 (Arg), Constructora del Sur S.R.L.
 */
export const RAZON_SOCIAL_REGEX = /^[\p{L}\p{M}'\u2019\-\s0-9\.&\/()]+$/u;

/**
 * Normalized DNI (Argentine): 7 or 8 digits, no dots.
 * Apply normalizeDNI() before validating.
 */
export const DNI_REGEX = /^\d{7,8}$/;

/**
 * Normalized CUIL/CUIT: exactly 11 digits, no dashes.
 * Common prefixes: 20, 23, 24, 27 (persons), 30, 33, 34 (companies).
 * Apply normalizeCUIL() before validating.
 */
export const CUIL_REGEX = /^(20|23|24|27|30|33|34)\d{9}$/;
