import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyListing,
  PropertyListingType,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type CreatePropertyListingData =
  Prisma.PropertyListingUncheckedCreateInput;

export type UpdatePropertyListingData =
  Prisma.PropertyListingUncheckedUpdateInput;

export interface FindManyPropertyListingsOptions {
  propertyId?: string;
  listingType?: PropertyListingType;
  status?: Prisma.EnumPropertyListingStatusFilter['equals'];
}

@Injectable()
export class PropertyListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePropertyListingData): Promise<PropertyListing> {
    return this.prisma.propertyListing.create({ data });
  }

  findById(id: string, tenantId: string): Promise<PropertyListing | null> {
    return this.prisma.propertyListing.findFirst({
      where: { id, tenantId },
    });
  }

  findByPropertyAndListingType(
    propertyId: string,
    listingType: PropertyListingType,
    excludeId?: string,
  ): Promise<PropertyListing | null> {
    return this.prisma.propertyListing.findFirst({
      where: {
        propertyId,
        listingType,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
  }

  findMany(
    tenantId: string,
    options: FindManyPropertyListingsOptions = {},
  ): Promise<PropertyListing[]> {
    const { propertyId, listingType, status } = options;

    return this.prisma.propertyListing.findMany({
      where: {
        tenantId,
        ...(propertyId !== undefined ? { propertyId } : {}),
        ...(listingType !== undefined ? { listingType } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdatePropertyListingData,
  ): Promise<PropertyListing | null> {
    const result = await this.prisma.propertyListing.updateMany({
      where: { id, tenantId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  async softClose(
    id: string,
    tenantId: string,
  ): Promise<PropertyListing | null> {
    const result = await this.prisma.propertyListing.updateMany({
      where: { id, tenantId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, tenantId);
  }

  hasActiveListingForProperty(
    propertyId: string,
    tenantId: string,
    excludeListingId?: string,
  ): Promise<boolean> {
    return this.prisma.propertyListing
      .count({
        where: {
          propertyId,
          tenantId,
          status: 'ACTIVE',
          ...(excludeListingId ? { NOT: { id: excludeListingId } } : {}),
        },
      })
      .then((count) => count > 0);
  }

  async countActiveDashboardMetrics(tenantId: string): Promise<{
    sale: number;
    rent: number;
    featured: number;
  }> {
    const [sale, rent, temporaryRent, featured] = await Promise.all([
      this.prisma.propertyListing.count({
        where: { tenantId, status: 'ACTIVE', listingType: 'SALE' },
      }),
      this.prisma.propertyListing.count({
        where: { tenantId, status: 'ACTIVE', listingType: 'RENT' },
      }),
      this.prisma.propertyListing.count({
        where: { tenantId, status: 'ACTIVE', listingType: 'TEMPORARY_RENT' },
      }),
      this.prisma.propertyListing.count({
        where: { tenantId, status: 'ACTIVE', isFeatured: true },
      }),
    ]);

    return {
      sale,
      rent: rent + temporaryRent,
      featured,
    };
  }

  tenantExists(tenantId: string): Promise<boolean> {
    return this.prisma.tenant
      .count({ where: { id: tenantId } })
      .then((count) => count > 0);
  }
}
