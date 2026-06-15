import { Injectable } from '@nestjs/common';
import { Prisma, Property } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreatePropertyData = Prisma.PropertyUncheckedCreateInput;

export type UpdatePropertyData = Prisma.PropertyUncheckedUpdateInput;

export interface FindManyPropertiesOptions {
  isActive?: boolean;
}

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePropertyData): Promise<Property> {
    return this.prisma.property.create({ data });
  }

  findById(id: string, tenantId: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
    });
  }

  findBySlug(slug: string, tenantId: string): Promise<Property | null> {
    return this.prisma.property.findUnique({
      where: {
        tenantId_slug: { tenantId, slug },
      },
    });
  }

  findByInternalCode(
    internalCode: string,
    tenantId: string,
  ): Promise<Property | null> {
    return this.prisma.property.findUnique({
      where: {
        tenantId_internalCode: { tenantId, internalCode },
      },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyPropertiesOptions = {},
  ): Promise<Property[]> {
    const { isActive } = options;

    return this.prisma.property.findMany({
      where: {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyData,
  ): Promise<Property | null> {
    const result = await this.prisma.property.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  async softArchive(id: string, tenantId: string): Promise<Property | null> {
    const result = await this.prisma.property.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }

  userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    return this.prisma.user
      .count({
        where: { id: userId, tenantId },
      })
      .then((count) => count > 0);
  }
}
