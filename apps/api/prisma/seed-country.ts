import type { Country, PrismaClient } from '../generated/prisma/client';
import { resolveGeoTextFields } from './seed-utils/geo-text-fields';

export const ARGENTINA_COUNTRY = {
  name: 'Argentina',
  iso2: 'AR',
} as const;

export async function seedCountry(prisma: PrismaClient): Promise<Country> {
  const textFields = resolveGeoTextFields(ARGENTINA_COUNTRY.name);

  return prisma.country.upsert({
    where: { iso2: ARGENTINA_COUNTRY.iso2 },
    update: {
      name: ARGENTINA_COUNTRY.name,
      slug: textFields.slug,
      search: textFields.search,
    },
    create: {
      name: ARGENTINA_COUNTRY.name,
      iso2: ARGENTINA_COUNTRY.iso2,
      slug: textFields.slug,
      search: textFields.search,
    },
  });
}
