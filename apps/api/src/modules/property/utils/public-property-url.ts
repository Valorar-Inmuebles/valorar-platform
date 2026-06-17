import type { PropertyListingType } from '../../../../generated/prisma/client';

export function getPublicWebBaseUrl(): string | null {
  const base = process.env.PUBLIC_WEB_URL?.trim() ?? null;

  return base && base.length > 0 ? base.replace(/\/$/, '') : null;
}

export function buildPublicPropertyUrl(
  slug: string,
  listingType?: PropertyListingType,
): string | null {
  const base = getPublicWebBaseUrl();

  if (!base) {
    return null;
  }

  const url = new URL(`/propiedades/${encodeURIComponent(slug)}`, `${base}/`);

  if (listingType) {
    url.searchParams.set('listingType', listingType);
  }

  return url.toString();
}

export function resolveCommercialStatusVariant(
  isActive: boolean,
  isAnyPublishable: boolean,
): 'published' | 'commercial-draft' | 'archived' {
  if (!isActive) {
    return 'archived';
  }

  return isAnyPublishable ? 'published' : 'commercial-draft';
}
