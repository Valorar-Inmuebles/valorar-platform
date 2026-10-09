import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '../../../../generated/prisma/client';
import {
  canEditProperty,
  canViewProperty,
  hasPermission,
  DEFAULT_PROPERTY_TENANT_POLICIES,
  shouldScopePropertyList,
  type PropertyTenantPolicies,
} from '@repo/rbac';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../prisma/prisma.service';

export type PropertyAccessRecord = {
  id: string;
  tenantId: string;
  createdById: string;
  assignedToId: string | null;
};

@Injectable()
export class PropertyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Same policy engine as buildListWhere, with the caller's read snapshot. */
  async listReadContext(
    tenantId: string,
    user: AuthenticatedUser,
    tx: Prisma.TransactionClient,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN && user.tenantId !== tenantId) {
      throw new ForbiddenException('Invalid effective tenant');
    }
    const policies = await this.getTenantPolicies(tenantId, tx);
    const visibility = shouldScopePropertyList(user.role, policies)
      ? Prisma.sql`(p."createdById" = ${user.id} OR p."assignedToId" = ${user.id}
          OR EXISTS (SELECT 1 FROM "PropertyAgentAccess" a
            WHERE a."propertyId" = p.id AND a."tenantId" = ${tenantId}
              AND a."userId" = ${user.id} AND a."canView"))`
      : Prisma.sql`TRUE`;
    return {
      policies,
      where: Prisma.sql`p."tenantId" = ${tenantId} AND (${visibility})`,
    };
  }

  /** No I/O: page facts and policies were read together in a repeatable snapshot. */
  listCapabilities(
    property: PropertyAccessRecord & { isActive: boolean },
    user: AuthenticatedUser,
    policies: PropertyTenantPolicies,
    shared: { canView: boolean; canEdit: boolean } | null,
  ) {
    const sameTenant =
      property.tenantId === user.tenantId || user.role === UserRole.SUPER_ADMIN;
    const canEdit =
      sameTenant &&
      canEditProperty(this.toAccessContext(property, user, policies, shared));
    return {
      canEdit,
      canArchive:
        property.isActive &&
        canEdit &&
        hasPermission(user.role, 'property.delete'),
      canRestore: !property.isActive && canEdit,
    };
  }

  /** Prisma filter for property list queries scoped by tenant policies. */
  async buildListWhere(
    tenantId: string,
    user: AuthenticatedUser,
    base: Prisma.PropertyWhereInput = {},
    tenantPolicies?: PropertyTenantPolicies,
  ): Promise<Prisma.PropertyWhereInput> {
    const role = user.role;
    const policies = tenantPolicies ?? (await this.getTenantPolicies(tenantId));

    if (!shouldScopePropertyList(role, policies)) {
      return { ...base, tenantId };
    }

    return {
      ...base,
      tenantId,
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        {
          agentAccess: {
            some: {
              userId: user.id,
              canView: true,
            },
          },
        },
      ],
    };
  }

  async assertCanViewProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (!(await this.userCanViewProperty(property, user))) {
      throw new ForbiddenException('You do not have access to this property');
    }
  }

  async assertCanEditProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (!(await this.userCanEditProperty(property, user))) {
      throw new ForbiddenException(
        'You do not have permission to edit this property',
      );
    }
  }

  async userCanViewProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (
      property.tenantId !== user.tenantId &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      return false;
    }

    const [shared, policies] = await Promise.all([
      this.getSharedAccess(property.id, user.id),
      this.getTenantPolicies(property.tenantId),
    ]);

    return canViewProperty(
      this.toAccessContext(property, user, policies, shared),
    );
  }

  async userCanEditProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (
      property.tenantId !== user.tenantId &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      return false;
    }

    const [shared, policies] = await Promise.all([
      this.getSharedAccess(property.id, user.id),
      this.getTenantPolicies(property.tenantId),
    ]);

    return canEditProperty(
      this.toAccessContext(property, user, policies, shared),
    );
  }

  async getTenantPolicies(
    tenantId: string,
    reader: Pick<Prisma.TransactionClient, 'tenantSetting'> = this.prisma,
  ): Promise<PropertyTenantPolicies> {
    const settings = await reader.tenantSetting.findUnique({
      where: { tenantId },
      select: {
        propertyVisibilityPolicy: true,
        propertyEditPolicy: true,
      },
    });

    if (!settings) {
      return DEFAULT_PROPERTY_TENANT_POLICIES;
    }

    return {
      visibility: settings.propertyVisibilityPolicy,
      edit: settings.propertyEditPolicy,
    };
  }

  private toAccessContext(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
    policies: PropertyTenantPolicies,
    shared: { canView: boolean; canEdit: boolean } | null,
  ) {
    return {
      userId: user.id,
      role: user.role,
      createdById: property.createdById,
      assignedToId: property.assignedToId,
      tenantPolicies: policies,
      sharedCanView: shared?.canView,
      sharedCanEdit: shared?.canEdit,
    };
  }

  private getSharedAccess(propertyId: string, userId: string) {
    return this.prisma.propertyAgentAccess.findUnique({
      where: {
        propertyId_userId: { propertyId, userId },
      },
      select: { canView: true, canEdit: true },
    });
  }
}
