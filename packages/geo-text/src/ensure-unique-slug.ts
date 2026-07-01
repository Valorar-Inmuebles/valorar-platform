export function ensureUniqueSlug(
  baseSlug: string,
  usedSlugs: Set<string>,
): string {
  const normalizedBase = baseSlug || 'item';
  let slug = normalizedBase;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
}
