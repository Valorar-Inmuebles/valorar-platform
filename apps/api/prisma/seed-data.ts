import { UserRole } from '../generated/prisma/client';

export const DEMO_TENANT_SLUG = 'demo';
export const DEMO_TENANT_NAME = 'Demo Inmobiliaria';

/** Documented dev password — set via SEED_DEFAULT_PASSWORD in .env (see apps/api/README.md). */
export const DOCUMENTED_DEV_PASSWORD_HINT = 'ValorarDev2026!';

export type SeedUserSpec = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** null = platform user without tenant (SUPER_ADMIN) */
  tenantSlug: string | null;
};

export const SEED_USERS: SeedUserSpec[] = [
  {
    email: 'super@valorar.dev',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    tenantSlug: null,
  },
  {
    email: 'admin@demo.valorar.dev',
    firstName: 'Admin',
    lastName: 'Demo',
    role: UserRole.TENANT_ADMIN,
    tenantSlug: DEMO_TENANT_SLUG,
  },
  {
    email: 'manager@demo.valorar.dev',
    firstName: 'Manager',
    lastName: 'Demo',
    role: UserRole.MANAGER,
    tenantSlug: DEMO_TENANT_SLUG,
  },
  {
    email: 'agent@demo.valorar.dev',
    firstName: 'Agent',
    lastName: 'Demo',
    role: UserRole.AGENT,
    tenantSlug: DEMO_TENANT_SLUG,
  },
  {
    email: 'collab@demo.valorar.dev',
    firstName: 'Colaborador',
    lastName: 'Demo',
    role: UserRole.COLLABORATOR,
    tenantSlug: DEMO_TENANT_SLUG,
  },
];

export function seedUserFullName(spec: SeedUserSpec): string {
  return `${spec.firstName} ${spec.lastName}`.trim();
}
