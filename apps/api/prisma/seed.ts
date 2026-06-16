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

    console.log('Auth dev seed completed.');
    console.log(`Tenant: ${DEMO_TENANT_NAME} (slug: ${DEMO_TENANT_SLUG}, id: ${tenant.id})`);
    console.log('Users (password = SEED_DEFAULT_PASSWORD from .env):');
    for (const spec of SEED_USERS) {
      const tenantLabel =
        spec.tenantSlug === null ? 'null (platform)' : `${DEMO_TENANT_SLUG} (${tenant.id})`;
      console.log(`  - ${spec.role}: ${spec.email} → tenant ${tenantLabel}`);
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
