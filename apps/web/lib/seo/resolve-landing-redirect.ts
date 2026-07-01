import type { GeoLocality, GeoProvince } from "@repo/shared-types";
import { getLocalitiesByProvince, getProvinces } from "@/lib/api/geo";
import { buildPropertyListUrl } from "@/lib/url/search-params";
import {
  LISTING_TYPE_LANDING_SLUGS,
  PROPERTY_TYPE_LANDING_SLUGS,
  parseLandingSegments,
} from "@/lib/seo/landing-routes";

async function findProvinceBySlug(slug: string): Promise<GeoProvince | null> {
  const provinces = await getProvinces();
  return provinces.find((province) => province.slug === slug) ?? null;
}

async function findLocalityBySlug(
  provinceId: string,
  slug: string,
): Promise<GeoLocality | null> {
  const localities = await getLocalitiesByProvince(provinceId);
  return localities.find((locality) => locality.slug === slug) ?? null;
}

export async function resolveLandingRedirect(
  segments: string[],
): Promise<string | null> {
  const parsed = parseLandingSegments(segments);

  if (!parsed?.provinceSlug) {
    return null;
  }

  const province = await findProvinceBySlug(parsed.provinceSlug);

  if (!province) {
    return null;
  }

  let localityId: string | undefined;
  let city: string | undefined;

  if (parsed.localitySlug) {
    const locality = await findLocalityBySlug(province.id, parsed.localitySlug);

    if (!locality) {
      return null;
    }

    localityId = locality.id;
    city = locality.name;
  }

  const propertyType = parsed.propertyTypeSlug
    ? PROPERTY_TYPE_LANDING_SLUGS[parsed.propertyTypeSlug]
    : undefined;

  const listingType = parsed.listingTypeSlug
    ? LISTING_TYPE_LANDING_SLUGS[parsed.listingTypeSlug]
    : undefined;

  return buildPropertyListUrl({
    provinceId: province.id,
    localityId,
    city,
    propertyType,
    listingType,
    page: 1,
  });
}
