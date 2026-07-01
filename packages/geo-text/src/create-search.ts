const SEARCH_STRIP_PATTERN = /[^a-z0-9]/g;

export function createSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(SEARCH_STRIP_PATTERN, '');
}
