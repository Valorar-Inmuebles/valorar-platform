import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '../../../../generated/prisma/client';
import type { PlatformRole } from '@repo/rbac';
import { canEditProperty, canViewProperty } from '@repo/rbac';
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

  /** Prisma filter for property list queries scoped by role. */
  buildListWhere(
    tenantId: string,
    user: AuthenticatedUser,
    base: Prisma.PropertyWhereInput = {},
  ): Prisma.PropertyWhereInput {
    const role = user.role as PlatformRole;

    if (
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.TENANT_ADMIN ||
      role === UserRole.MANAGER
    ) {
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

    const shared = await this.getSharedAccess(property.id, user.id);

    return canViewProperty({
      userId: user.id,
      role: user.role as PlatformRole,
      createdById: property.createdById,
      assignedToId: property.assignedToId,
      sharedCanView: shared?.canView,
    });
  }

  async userCanEditProperty(
    property: PropertyAccessRecord,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (property.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      return false;
    }

    const shared = await this.getSharedAccess(property.id, user.id);

    return canEditProperty({
      userId: user.id,
      role: user.role as PlatformRole,
      createdById: property.createdById,
      assignedToId: property.assignedToId,
      sharedCanEdit: shared?.canEdit,
    });
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
