import { Injectable } from '@nestjs/common';
import { Prisma, PropertyPrice } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreatePropertyPriceData = Prisma.PropertyPriceUncheckedCreateInput;

export type UpdatePropertyPriceData = Prisma.PropertyPriceUncheckedUpdateInput;

export interface FindManyPropertyPricesOptions {
  listingId?: string;
}

@Injectable()
export class PropertyPriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithPrimaryHandling(
    data: CreatePropertyPriceData,
    demoteOthers: boolean,
  ): Promise<PropertyPrice> {
    if (!demoteOthers) {
      return this.prisma.propertyPrice.create({ data });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.propertyPrice.updateMany({
        where: {
          listingId: data.listingId,
          tenantId: data.tenantId,
        },
        data: { isPrimary: false },
      });

      return tx.propertyPrice.create({ data });
    });
  }

  findById(id: string, tenantId: string): Promise<PropertyPrice | null> {
    return this.prisma.propertyPrice.findFirst({
      where: { id, tenantId },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyPropertyPricesOptions = {},
  ): Promise<PropertyPrice[]> {
    const { listingId } = options;

    return this.prisma.propertyPrice.findMany({
      where: {
        tenantId,
        ...(listingId !== undefined ? { listingId } : {}),
      },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  countByListing(listingId: string, tenantId: string): Promise<number> {
    return this.prisma.propertyPrice.count({
      where: { listingId, tenantId },
    });
  }

  hasPrimaryPrice(listingId: string, tenantId: string): Promise<boolean> {
    return this.prisma.propertyPrice
      .count({
        where: { listingId, tenantId, isPrimary: true },
      })
      .then((count) => count > 0);
  }

  async getListingIdsWithPrimaryPrice(
    tenantId: string,
    listingIds: string[],
  ): Promise<Set<string>> {
    if (listingIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.propertyPrice.findMany({
      where: {
        tenantId,
        listingId: { in: listingIds },
        isPrimary: true,
      },
      select: { listingId: true },
    });

    return new Set(rows.map((row) => row.listingId));
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyPriceData,
  ): Promise<PropertyPrice | null> {
    const result = await this.prisma.propertyPrice.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  updateWithPrimaryHandling(
    id: string,
    tenantId: string,
    listingId: string,
    data: UpdatePropertyPriceData,
    demoteOthers: boolean,
  ): Promise<PropertyPrice | null> {
    if (!demoteOthers) {
      return this.update(id, tenantId, data);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.propertyPrice.updateMany({
        where: {
          listingId,
          tenantId,
          NOT: { id },
        },
        data: { isPrimary: false },
      });

      const result = await tx.propertyPrice.updateMany({
        where: { id, tenantId },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.propertyPrice.findFirst({
        where: { id, tenantId },
      });
    });
  }

  updateWithPrimaryDemotion(
    id: string,
    tenantId: string,
    listingId: string,
    data: UpdatePropertyPriceData,
  ): Promise<PropertyPrice | null> {
    return this.prisma.$transaction(async (tx) => {
      const nextPrimary = await tx.propertyPrice.findFirst({
        where: {
          listingId,
          tenantId,
          NOT: { id },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!nextPrimary) {
        return null;
      }

      await tx.propertyPrice.updateMany({
        where: { listingId, tenantId },
        data: { isPrimary: false },
      });

      const result = await tx.propertyPrice.updateMany({
        where: { id, tenantId },
        data,
      });

      if (result.count === 0) {
        return null;
      }

      await tx.propertyPrice.updateMany({
        where: { id: nextPrimary.id, tenantId },
        data: { isPrimary: true },
      });

      return tx.propertyPrice.findFirst({
        where: { id, tenantId },
      });
    });
  }

  async deleteWithPromotion(
    id: string,
    tenantId: string,
    listingId: string,
    wasPrimary: boolean,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (wasPrimary) {
        const nextPrimary = await tx.propertyPrice.findFirst({
          where: {
            listingId,
            tenantId,
            NOT: { id },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextPrimary) {
          await tx.propertyPrice.updateMany({
            where: { listingId, tenantId },
            data: { isPrimary: false },
          });

          await tx.propertyPrice.updateMany({
            where: { id: nextPrimary.id, tenantId },
            data: { isPrimary: true },
          });
        }
      }

      const result = await tx.propertyPrice.deleteMany({
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
