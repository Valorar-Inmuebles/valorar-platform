import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../../../generated/prisma/client';
import {
  canEditProperty,
  canViewProperty,
  DEFAULT_PROPERTY_TENANT_POLICIES,
  roleViewsAllProperties,
  shouldScopePropertyList,
  type PlatformRole,
  type PropertyTenantPolicies,
} from '@repo/rbac';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Prisma } from '../../../../generated/prisma/client';

export type PropertyAccessRecord = {
  id: string;
  tenantId: string;
  createdById: string;
  assignedToId: string | null;
};

@Injectable()
export class PropertyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Prisma filter for property list queries scoped by tenant policies. */
  async buildListWhere(
    tenantId: string,
    user: AuthenticatedUser,
    base: Prisma.PropertyWhereInput = {},
  ): Promise<Prisma.PropertyWhereInput> {
    const role = user.role as PlatformRole;
    const policies = await this.getTenantPolicies(tenantId);

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
      throw new ForbiddenException('You do not have permission to edit this property');
    }
  }

  async userCanViewProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (property.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      return false;
    }

    const [shared, policies] = await Promise.all([
      this.getSharedAccess(property.id, user.id),
      this.getTenantPolicies(property.tenantId),
    ]);

    return canViewProperty(this.toAccessContext(property, user, policies, shared));
  }

  async userCanEditProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (property.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      return false;
    }

    const [shared, policies] = await Promise.all([
      this.getSharedAccess(property.id, user.id),
      this.getTenantPolicies(property.tenantId),
    ]);

    return canEditProperty(this.toAccessContext(property, user, policies, shared));
  }

  async getTenantPolicies(tenantId: string): Promise<PropertyTenantPolicies> {
    const settings = await this.prisma.tenantSetting.findUnique({
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
      role: user.role as PlatformRole,
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
