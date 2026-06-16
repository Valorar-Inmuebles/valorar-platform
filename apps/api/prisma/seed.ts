import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, UserRole } from '../generated/prisma/client';
import { hashPassword } from '../src/modules/auth/utils/password.util';

const DEMO_TENANT_SLUG = 'demo';
const DEMO_ADMIN_EMAIL = 'admin@demo.valorar.dev';
const DEFAULT_DEV_PASSWORD = 'ValorarDev2026!';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run auth dev seed in production.');
  }

  const password =
    process.env.SEED_DEFAULT_PASSWORD?.trim() || DEFAULT_DEV_PASSWORD;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(password);

    const tenant = await prisma.tenant.upsert({
      where: { slug: DEMO_TENANT_SLUG },
      update: { name: 'Demo Inmobiliaria' },
      create: {
        name: 'Demo Inmobiliaria',
        slug: DEMO_TENANT_SLUG,
      },
    });

    await prisma.user.upsert({
      where: { email: DEMO_ADMIN_EMAIL },
      update: {
        name: 'Admin Demo',
        role: UserRole.TENANT_ADMIN,
        tenantId: tenant.id,
        passwordHash,
        isActive: true,
      },
      create: {
        email: DEMO_ADMIN_EMAIL,
        name: 'Admin Demo',
        role: UserRole.TENANT_ADMIN,
        tenantId: tenant.id,
        passwordHash,
        isActive: true,
      },
    });

    console.log('Auth dev seed completed.');
    console.log(`Tenant slug: ${DEMO_TENANT_SLUG}`);
    console.log(`Admin email: ${DEMO_ADMIN_EMAIL}`);
    console.log(
      'Admin password: value of SEED_DEFAULT_PASSWORD or default dev password documented in README.',
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
