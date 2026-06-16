import { UserRole } from '../generated/prisma/client';

export const DEMO_TENANT_SLUG = 'demo';
export const DEMO_TENANT_NAME = 'Demo Inmobiliaria';

/** Documented dev password — set via SEED_DEFAULT_PASSWORD in .env (see apps/api/README.md). */
export const DOCUMENTED_DEV_PASSWORD_HINT = 'ValorarDev2026!';

export type SeedUserSpec = {
  email: string;
  name: string;
  role: UserRole;
  /** null = platform user without tenant (SUPER_ADMIN) */
  tenantSlug: string | null;
};

export const SEED_USERS: SeedUserSpec[] = [
  {
    email: 'super@valorar.dev',
    name: 'Super Admin Demo',
    role: UserRole.SUPER_ADMIN,
    tenantSlug: null,
  },
  {
    email: 'admin@demo.valorar.dev',
    name: 'Admin Demo',
    role: UserRole.TENANT_ADMIN,
    tenantSlug: DEMO_TENANT_SLUG,
  },
  {
    email: 'agent@demo.valorar.dev',
    name: 'Agent Demo',
    role: UserRole.AGENT,
    tenantSlug: DEMO_TENANT_SLUG,
  },
];
