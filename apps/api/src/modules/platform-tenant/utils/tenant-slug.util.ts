export function slugifyTenantName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function resolveUniqueTenantSlug(
  baseSlug: string,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = slugifyTenantName(baseSlug);

  if (!normalized) {
    throw new Error('Invalid slug base');
  }

  if (!(await slugExists(normalized))) {
    return normalized;
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${normalized}-${index}`;
    if (!(await slugExists(candidate))) {
      return candidate;
    }
  }

  return `${normalized}-${Date.now()}`;
}
