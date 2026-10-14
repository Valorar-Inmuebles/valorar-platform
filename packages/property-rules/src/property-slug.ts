/** Shared preview and API base; uniqueness is enforced by the tenant DB key. */
export function propertySlugFromTitle(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 120)
    .replace(/^-+|-+$/g, "");
  return slug.length >= 3 ? slug : "propiedad";
}

export function propertySlugCandidate(base: string, ordinal: number): string {
  const suffix = ordinal === 1 ? "" : `-${ordinal}`;
  return `${base.slice(0, 120 - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
