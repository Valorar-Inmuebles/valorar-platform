import {
  CREATOR_ROLES,
  DEFAULT_CREATOR_EMAIL,
  DEFAULT_TENANT_SLUG,
} from '../constants';
import type { GateIssue, ResolvedActor } from '../types';

export type ActorPrisma = {
  tenant: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      slug: string;
      status: string;
    } | null>;
    findMany: (
      args?: unknown,
    ) => Promise<Array<{ id: string; slug: string; status: string }>>;
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

export type ActorResolution =
  | { ok: true; actor: ResolvedActor }
  | {
      ok: false;
      blockers: GateIssue[];
      candidates: string[];
    };

export async function resolveTenantAndCreator(input: {
  prisma: ActorPrisma;
  tenantSlug?: string;
  createdBy?: string;
}): Promise<ActorResolution> {
  const tenantSlug = input.tenantSlug?.trim() || DEFAULT_TENANT_SLUG;
  const tenant = await input.prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    const tenants = await input.prisma.tenant.findMany({
      orderBy: { slug: 'asc' },
    });
    return {
      ok: false,
      blockers: [
        {
          code: 'TENANT_NOT_FOUND',
          message: `Tenant slug="${tenantSlug}" was not found. Refusing to pick another tenant.`,
          blocking: true,
        },
      ],
      candidates: tenants.map((item) => `${item.slug} (${item.status})`),
    };
  }

  if (tenant.status !== 'ACTIVE') {
    return {
      ok: false,
      blockers: [
        {
          code: 'TENANT_INACTIVE',
          message: `Tenant slug="${tenant.slug}" is ${tenant.status}.`,
          blocking: true,
        },
      ],
      candidates: [`${tenant.slug} (${tenant.status})`],
    };
  }

  const users = await input.prisma.user.findMany({
    where: { tenantId: tenant.id },
  });
  const requestedEmail = input.createdBy?.trim().toLowerCase();
  const eligible = users.filter(
    (user) =>
      user.isActive &&
      user.tenantId === tenant.id &&
      (CREATOR_ROLES as readonly string[]).includes(user.role),
  );

  if (requestedEmail) {
    const matches = eligible.filter(
      (user) => user.email.toLowerCase() === requestedEmail,
    );
    if (matches.length !== 1) {
      return {
        ok: false,
        blockers: [
          {
            code: 'CREATOR_NOT_RESOLVED',
            message: `Could not resolve exactly one active creator for --created-by. Expected one eligible user.`,
            blocking: true,
          },
        ],
        candidates: eligible.map(
          (user) => `${user.email} (${user.role}, active=${user.isActive})`,
        ),
      };
    }
    const user = matches[0];
    return {
      ok: true,
      actor: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantStatus: tenant.status,
        userId: user.id,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
      },
    };
  }

  const preferred = eligible.filter(
    (user) => user.email.toLowerCase() === DEFAULT_CREATOR_EMAIL,
  );
  const chosen =
    preferred.length === 1
      ? preferred[0]
      : eligible.length === 1
        ? eligible[0]
        : null;

  if (!chosen) {
    return {
      ok: false,
      blockers: [
        {
          code: 'CREATOR_NOT_RESOLVED',
          message:
            'Could not resolve exactly one active creator with adequate permissions. Pass --created-by explicitly.',
          blocking: true,
        },
      ],
      candidates: eligible.map(
        (user) => `${user.email} (${user.role}, active=${user.isActive})`,
      ),
    };
  }

  return {
    ok: true,
    actor: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
      userId: chosen.id,
      email: chosen.email,
      isActive: chosen.isActive,
      role: chosen.role,
    },
  };
}
