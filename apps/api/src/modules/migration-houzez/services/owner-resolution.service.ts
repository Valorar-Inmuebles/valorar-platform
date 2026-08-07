import type { OwnerResolution } from '../types';

export type OwnerPrisma = {
  tenant: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      slug: string;
      status: string;
    } | null>;
  };
  user: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        email: string;
        tenantId: string | null;
        isActive: boolean;
        role: string;
      }>
    >;
  };
};

export async function resolveOwner(input: {
  prisma: OwnerPrisma;
  tenantSlug: string;
  ownerEmail: string;
}): Promise<OwnerResolution> {
  const errors: string[] = [];
  const tenant = await input.prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });
  if (!tenant) {
    return {
      ok: false,
      errors: [`Tenant slug="${input.tenantSlug}" does not exist.`],
    };
  }
  if (tenant.status !== 'ACTIVE') {
    errors.push(`Tenant "${input.tenantSlug}" status is ${tenant.status}.`);
  }

  const users = await input.prisma.user.findMany({
    where: { email: input.ownerEmail },
  });
  if (users.length === 0) {
    errors.push(`User email="${input.ownerEmail}" does not exist.`);
    return { ok: false, tenantId: tenant.id, tenantSlug: tenant.slug, errors };
  }
  if (users.length > 1) {
    errors.push(
      `User email="${input.ownerEmail}" matched ${users.length} rows; expected unique.`,
    );
    return { ok: false, tenantId: tenant.id, tenantSlug: tenant.slug, errors };
  }

  const user = users[0];
  if (user.tenantId !== tenant.id) {
    errors.push(
      `User does not belong to tenant "${input.tenantSlug}" (tenantId mismatch).`,
    );
  }
  if (!user.isActive) {
    errors.push('User is inactive.');
  }
  // Relations needed for Property create: user must be able to be createdBy/assignedTo
  if (!user.tenantId) {
    errors.push('User has no tenantId; cannot own tenant properties.');
  }

  if (errors.length) {
    return {
      ok: false,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      email: user.email,
      role: user.role,
      errors,
    };
  }

  return {
    ok: true,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    email: user.email,
    role: user.role,
    errors: [],
  };
}
