import { createSearch } from '@repo/geo-text';
import {
  CANONICAL_CABA_PROVINCE_ISO_CODE,
  CANONICAL_CABA_PROVINCE_SLUG,
  DEFAULT_COUNTRY,
  DEFAULT_PROVINCE_NAME,
} from '../constants';
import type { LocationResolution } from '../types';

export type LiveGeoPrisma = {
  country: {
    findFirst: (args: unknown) => Promise<{ id: string; iso2: string } | null>;
  };
  province: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        name: string;
        slug: string;
        isoCode: string | null;
        search: string;
      }>
    >;
  };
  locality: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        name: string;
        slug: string;
        search: string;
        provinceId: string;
      }>
    >;
  };
};

export type LiveGeoResolution = {
  ok: boolean;
  countryId: string | null;
  provinceId: string | null;
  localityId: string | null;
  errors: string[];
};

export async function resolveLiveGeo(input: {
  prisma: LiveGeoPrisma;
  location: LocationResolution;
}): Promise<LiveGeoResolution> {
  const errors: string[] = [];
  const country = await input.prisma.country.findFirst({
    where: { iso2: DEFAULT_COUNTRY },
  });
  if (!country) {
    errors.push('Country AR was not found in the live geo catalog.');
  }

  const provinces = await input.prisma.province.findMany({
    where: {
      OR: [
        { slug: CANONICAL_CABA_PROVINCE_SLUG },
        { isoCode: CANONICAL_CABA_PROVINCE_ISO_CODE },
        { name: DEFAULT_PROVINCE_NAME },
      ],
    },
  });
  const canonical = provinces.filter(
    (province) =>
      province.slug === CANONICAL_CABA_PROVINCE_SLUG ||
      province.isoCode === CANONICAL_CABA_PROVINCE_ISO_CODE,
  );
  if (canonical.length !== 1) {
    errors.push(
      `Expected exactly one Capital Federal province (slug=${CANONICAL_CABA_PROVINCE_SLUG}, iso=${CANONICAL_CABA_PROVINCE_ISO_CODE}). Found ${canonical.length}.`,
    );
    return {
      ok: false,
      countryId: country?.id ?? null,
      provinceId: null,
      localityId: null,
      errors,
    };
  }

  const province = canonical[0];
  const localityName = input.location.localityName;
  const localitySlug = input.location.localitySlug;
  const localitySearch =
    input.location.localitySearch ??
    (localityName ? createSearch(localityName) : null);

  if (!localityName || !localitySlug) {
    errors.push('Planned locality is incomplete; refusing to guess.');
    return {
      ok: false,
      countryId: country?.id ?? null,
      provinceId: province.id,
      localityId: null,
      errors,
    };
  }

  const localities = await input.prisma.locality.findMany({
    where: {
      provinceId: province.id,
      OR: [
        { slug: localitySlug },
        { search: localitySearch },
        { name: localityName },
      ],
    },
  });
  const exact = localities.filter(
    (item) =>
      item.slug === localitySlug ||
      item.search === localitySearch ||
      item.name === localityName,
  );
  const uniqueIds = [...new Set(exact.map((item) => item.id))];
  if (uniqueIds.length !== 1) {
    errors.push(
      `Expected exactly one locality "${localityName}" under ${province.name}. Found ${uniqueIds.length}.`,
    );
    return {
      ok: false,
      countryId: country?.id ?? null,
      provinceId: province.id,
      localityId: null,
      errors,
    };
  }

  return {
    ok: errors.length === 0,
    countryId: country?.id ?? null,
    provinceId: province.id,
    localityId: uniqueIds[0],
    errors,
  };
}
