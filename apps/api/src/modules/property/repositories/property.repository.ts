import { Injectable } from '@nestjs/common';
import { Prisma, Property } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { propertyGeoInclude } from '../utils/property-location';

export type CreatePropertyData = Prisma.PropertyUncheckedCreateInput;

export type UpdatePropertyData = Prisma.PropertyUncheckedUpdateInput;

export type PropertyRecord = Prisma.PropertyGetPayload<{
  include: typeof propertyGeoInclude;
}>;

export type PropertyWithCreatorRecord = PropertyRecord & {
  createdBy: { id: string; name: string };
};

export interface FindManyPropertiesOptions {
  isActive?: boolean;
  where?: Prisma.PropertyWhereInput;
}

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePropertyData): Promise<PropertyRecord> {
    return this.prisma.property.create({
      data,
      include: propertyGeoInclude,
    });
  }

  findById(id: string, tenantId: string): Promise<PropertyRecord | null> {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
      include: propertyGeoInclude,
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
  ): Promise<PropertyRecord[]> {
    const { isActive, where: extraWhere } = options;

    return this.prisma.property.findMany({
      where: extraWhere ?? {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: propertyGeoInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findManyWithCreator(tenantId: string): Promise<PropertyWithCreatorRecord[]> {
    return this.prisma.property.findMany({
      where: { tenantId },
      include: {
        ...propertyGeoInclude,
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  count(
    tenantId: string,
    options: FindManyPropertiesOptions = {},
  ): Promise<number> {
    const { isActive } = options;

    return this.prisma.property.count({
      where: {
        tenantId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyData,
  ): Promise<PropertyRecord | null> {
    const result = await this.prisma.property.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  async softArchive(id: string, tenantId: string): Promise<PropertyRecord | null> {
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
