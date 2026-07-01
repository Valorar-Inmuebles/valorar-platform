const SLUG_SEPARATOR_PATTERN = /[^a-z0-9]+/g;

export function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(SLUG_SEPARATOR_PATTERN, '-')
    .replace(/^-+|-+$/g, '');
}
