import { Injectable } from '@nestjs/common';
import { Prisma, PropertyImage } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreatePropertyImageData = Prisma.PropertyImageUncheckedCreateInput;

export type UpdatePropertyImageData = Prisma.PropertyImageUncheckedUpdateInput;

export interface FindManyPropertyImagesOptions {
  propertyId?: string;
}

@Injectable()
export class PropertyImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithCoverHandling(
    data: CreatePropertyImageData,
    demoteOthers: boolean,
  ): Promise<PropertyImage> {
    if (!demoteOthers) {
      return this.prisma.propertyImage.create({ data });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.propertyImage.updateMany({
        where: {
          propertyId: data.propertyId,
          tenantId: data.tenantId,
        },
        data: { isCover: false },
      });

      return tx.propertyImage.create({ data });
    });
  }

  findById(id: string, tenantId: string): Promise<PropertyImage | null> {
    return this.prisma.propertyImage.findFirst({
      where: { id, tenantId },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyPropertyImagesOptions = {},
  ): Promise<PropertyImage[]> {
    const { propertyId } = options;

    return this.prisma.propertyImage.findMany({
      where: {
        tenantId,
        ...(propertyId !== undefined ? { propertyId } : {}),
      },
      orderBy: [
        { isCover: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  countByProperty(propertyId: string, tenantId: string): Promise<number> {
    return this.prisma.propertyImage.count({
      where: { propertyId, tenantId },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyImageData,
  ): Promise<PropertyImage | null> {
    const result = await this.prisma.propertyImage.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  updateWithCoverHandling(
    id: string,
    tenantId: string,
    propertyId: string,
    data: UpdatePropertyImageData,
    demoteOthers: boolean,
  ): Promise<PropertyImage | null> {
    if (!demoteOthers) {
      return this.update(id, tenantId, data);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.propertyImage.updateMany({
        where: {
          propertyId,
          tenantId,
          NOT: { id },
        },
        data: { isCover: false },
      });

      const result = await tx.propertyImage.updateMany({
        where: { id, tenantId },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.propertyImage.findFirst({
        where: { id, tenantId },
      });
    });
  }

  async deleteWithPromotion(
    id: string,
    tenantId: string,
    propertyId: string,
    wasCover: boolean,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (wasCover) {
        const nextCover = await tx.propertyImage.findFirst({
          where: {
            propertyId,
            tenantId,
            NOT: { id },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextCover) {
          await tx.propertyImage.updateMany({
            where: { propertyId, tenantId },
            data: { isCover: false },
          });

          await tx.propertyImage.updateMany({
            where: { id: nextCover.id, tenantId },
            data: { isCover: true },
          });
        }
      }

      const result = await tx.propertyImage.deleteMany({
        where: { id, tenantId },
      });

      return result.count > 0;
    });
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
