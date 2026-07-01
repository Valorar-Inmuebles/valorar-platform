import type { PrismaClient } from '../generated/prisma/client';

import { seedCountry } from './seed-country';

import { seedLocalities } from './seed-localities';

import { seedNeighborhoods } from './seed-neighborhoods';

import { seedProvinces } from './seed-provinces';
import { backfillPropertyGeoFks } from './seed-utils/backfill-property-geo';



export type GeoSeedResult = {

  countryCount: number;

  provinceCount: number;

  localityCount: number;

  neighborhoodCount: number;

};



export function isGeoCatalogSeedEnabled(): boolean {

  return process.env.SEED_GEO_CATALOG === 'true';

}



function logStep(message: string): void {

  console.log(`[geo seed] ${message}`);

}



export async function seedGeoCatalog(

  prisma: PrismaClient,

): Promise<GeoSeedResult> {

  const startedAt = Date.now();



  logStep('step 1/4 — country');

  const country = await seedCountry(prisma);



  logStep('step 2/4 — provinces');

  const { count: provinceCount, maps: provinceMaps } = await seedProvinces(

    prisma,

    country,

  );

  logStep(`provinces done (${provinceCount})`);



  logStep('step 3/4 — localities');

  const localityCount = await seedLocalities(prisma, provinceMaps);



  logStep('step 4/4 — neighborhoods');

  const neighborhoodCount = await seedNeighborhoods(prisma);

  logStep(`neighborhoods done (${neighborhoodCount})`);

  logStep('step 5/5 — property geo backfill');
  const backfillStats = await backfillPropertyGeoFks(prisma);
  logStep(
    `property geo backfill done (${backfillStats.fullyMatched}/${backfillStats.totalProperties} fully matched)`,
  );

  logStep(`completed in ${Date.now() - startedAt}ms`);



  return {

    countryCount: 1,

    provinceCount,

    localityCount,

    neighborhoodCount,

  };

}

