const DEVELOPMENT_SLUG_PREFIX = "emprendimiento-";

export function isDevelopmentProperty(property: { slug: string }): boolean {
  return property.slug.startsWith(DEVELOPMENT_SLUG_PREFIX);
}
