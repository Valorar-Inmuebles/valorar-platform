import { Injectable } from '@nestjs/common';
import {
  Prisma,
  User,
  UserRole,
  type PrismaClient,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreateUserData = {
  tenantId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  passwordHash: string;
  role: UserRole;
  isActive?: boolean;
};

export type UpdateUserData = Prisma.UserUncheckedUpdateInput;

export type UserDeletionRelationCounts = {
  createdPropertiesCount: number;
  createdDevelopmentsCount: number;
  activeTenantAdminCount: number;
  assignedPropertiesCount: number;
  agentAccessAsUserCount: number;
  agentAccessGrantedByCount: number;
};

export type UserPropertyCountsById = {
  assigned: Map<string, number>;
  created: Map<string, number>;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByTenant(tenantId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Aggregated property counts for a user list (avoids N+1).
   * Assigned = cartera (assignedToId); created = autoría histórica (createdById).
   */
  async getPropertyCountsByUserIds(
    tenantId: string,
    userIds: string[],
  ): Promise<UserPropertyCountsById> {
    const assigned = new Map<string, number>();
    const created = new Map<string, number>();

    if (userIds.length === 0) {
      return { assigned, created };
    }

    const [assignedGroups, createdGroups] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['assignedToId'],
        where: { tenantId, assignedToId: { in: userIds } },
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['createdById'],
        where: { tenantId, createdById: { in: userIds } },
        _count: { _all: true },
      }),
    ]);

    for (const row of assignedGroups) {
      if (row.assignedToId) {
        assigned.set(row.assignedToId, row._count._all);
      }
    }

    for (const row of createdGroups) {
      created.set(row.createdById, row._count._all);
    }

    return { assigned, created };
  }

  findById(id: string, tenantId?: string | null): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  countActiveTenantAdmins(
    tenantId: string,
    client: PrismaClient | TxClient = this.prisma,
  ): Promise<number> {
    return client.user.count({
      where: {
        tenantId,
        role: UserRole.TENANT_ADMIN,
        isActive: true,
      },
    });
  }

  async getDeletionRelationCounts(
    userId: string,
    tenantId: string,
    client: PrismaClient | TxClient = this.prisma,
  ): Promise<UserDeletionRelationCounts> {
    const [
      createdPropertiesCount,
      createdDevelopmentsCount,
      activeTenantAdminCount,
      assignedPropertiesCount,
      agentAccessAsUserCount,
      agentAccessGrantedByCount,
    ] = await Promise.all([
      client.property.count({ where: { tenantId, createdById: userId } }),
      client.development.count({ where: { tenantId, createdById: userId } }),
      this.countActiveTenantAdmins(tenantId, client),
      client.property.count({ where: { tenantId, assignedToId: userId } }),
      client.propertyAgentAccess.count({
        where: { tenantId, userId },
      }),
      client.propertyAgentAccess.count({
        where: { tenantId, grantedById: userId },
      }),
    ]);

    return {
      createdPropertiesCount,
      createdDevelopmentsCount,
      activeTenantAdminCount,
      assignedPropertiesCount,
      agentAccessAsUserCount,
      agentAccessGrantedByCount,
    };
  }

  /**
   * Lock order (mandatory): Tenant row first, then User target.
   * Serializes concurrent admin lifecycle ops that affect different users
   * but share the last-active-TENANT_ADMIN invariant.
   */
  async withTenantUserLocks<T>(
    tenantId: string,
    userId: string,
    work: (ctx: {
      tx: TxClient;
      lockedUser: User | null;
    }) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE
      `;

      const lockedUsers = await tx.$queryRaw<User[]>`
        SELECT * FROM "User"
        WHERE id = ${userId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;

      return work({ tx, lockedUser: lockedUsers[0] ?? null });
    });
  }

  clearAssignedProperties(
    userId: string,
    tenantId: string,
    client: PrismaClient | TxClient,
  ): Promise<Prisma.BatchPayload> {
    return client.property.updateMany({
      where: { tenantId, assignedToId: userId },
      data: { assignedToId: null },
    });
  }

  deleteUser(
    userId: string,
    tenantId: string,
    client: PrismaClient | TxClient,
  ): Promise<Prisma.BatchPayload> {
    return client.user.deleteMany({
      where: { id: userId, tenantId },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateUserData,
    client: PrismaClient | TxClient = this.prisma,
  ): Promise<User | null> {
    const result = await client.user.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return client.user.findFirst({
      where: { id, tenantId },
    });
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
