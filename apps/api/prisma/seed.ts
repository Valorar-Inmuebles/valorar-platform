import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';
import { hashPassword } from '../src/modules/auth/utils/password.util';
import {
  DEMO_TENANT_NAME,
  DEMO_TENANT_SLUG,
  DOCUMENTED_DEV_PASSWORD_HINT,
  SEED_USERS,
} from './seed-data';
import { seedPropertyFeatures } from './seed-features';
import {
  countFeaturedDemoListings,
  countPublishableDemoProperties,
  isDemoPropertiesSeedEnabled,
  seedDemoProperties,
} from './seed-demo-properties';
import { isGeoCatalogSeedEnabled, seedGeoCatalog } from './seed-geo';

function resolveSeedPassword(): string {
  const password = process.env.SEED_DEFAULT_PASSWORD?.trim();

  if (!password) {
    throw new Error(
      `SEED_DEFAULT_PASSWORD is required. Set it in apps/api/.env (dev suggestion: ${DOCUMENTED_DEV_PASSWORD_HINT}). See apps/api/README.md.`,
    );
  }

  return password;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run auth dev seed in production.');
  }

  const password = resolveSeedPassword();
  const passwordHash = await hashPassword(password);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenant = await prisma.tenant.upsert({
      where: { slug: DEMO_TENANT_SLUG },
      update: { name: DEMO_TENANT_NAME },
      create: {
        name: DEMO_TENANT_NAME,
        slug: DEMO_TENANT_SLUG,
      },
    });

    for (const spec of SEED_USERS) {
      const tenantId =
        spec.tenantSlug === DEMO_TENANT_SLUG ? tenant.id : null;

      await prisma.user.upsert({
        where: { email: spec.email },
        update: {
          name: spec.name,
          role: spec.role,
          tenantId,
          passwordHash,
          isActive: true,
        },
        create: {
          email: spec.email,
          name: spec.name,
          role: spec.role,
          tenantId,
          passwordHash,
          isActive: true,
        },
      });
    }

    const featureCount = await seedPropertyFeatures(prisma);

    console.log('Auth dev seed completed.');
    console.log(`Property features seeded: ${featureCount}`);
    console.log(`Tenant: ${DEMO_TENANT_NAME} (slug: ${DEMO_TENANT_SLUG}, id: ${tenant.id})`);
    console.log('Users (password = SEED_DEFAULT_PASSWORD from .env):');
    for (const spec of SEED_USERS) {
      const tenantLabel =
        spec.tenantSlug === null ? 'null (platform)' : `${DEMO_TENANT_SLUG} (${tenant.id})`;
      console.log(`  - ${spec.role}: ${spec.email} → tenant ${tenantLabel}`);
    }

    if (isDemoPropertiesSeedEnabled()) {
      const demoResult = await seedDemoProperties(prisma);
      const publishableCount = await countPublishableDemoProperties(
        prisma,
        tenant.id,
      );
      const featuredCount = await countFeaturedDemoListings(prisma, tenant.id);

      console.log('');
      console.log('Demo properties seed completed (SEED_DEMO_PROPERTIES=true).');
      console.log(`  Properties: ${demoResult.propertyCount}`);
      console.log(`  Listings: ${demoResult.listingCount}`);
      console.log(`  Images: ${demoResult.imageCount}`);
      console.log(`  Feature assignments: ${demoResult.featureAssignmentCount}`);
      console.log(`  Publishable (public API rules): ${publishableCount}`);
      console.log(`  Featured listings: ${featuredCount}`);
    } else {
      console.log('');
      console.log(
        'Demo properties seed skipped (set SEED_DEMO_PROPERTIES=true to enable).',
      );
    }

    if (isGeoCatalogSeedEnabled()) {
      const geoResult = await seedGeoCatalog(prisma);

      console.log('');
      console.log('Geo catalog seed completed (SEED_GEO_CATALOG=true).');
      console.log(`  Countries: ${geoResult.countryCount}`);
      console.log(`  Provinces: ${geoResult.provinceCount}`);
      console.log(`  Localities: ${geoResult.localityCount}`);
      console.log(`  Neighborhoods: ${geoResult.neighborhoodCount}`);
    } else {
      console.log('');
      console.log(
        'Geo catalog seed skipped (set SEED_GEO_CATALOG=true to enable).',
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
