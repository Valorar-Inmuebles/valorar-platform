import { Injectable } from '@nestjs/common';
import {
  Currency,
  Prisma,
  PropertyListingStatus,
  PropertyListingType,
  PropertyType,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPropertyLocationWhere } from '../../property/utils/property-location-filters';
import { propertyGeoInclude } from '../../property/utils/property-location';

export interface FindManyPublicPropertiesFilters {
  listingType?: PropertyListingType;
  propertyType?: PropertyType;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  city?: string;
  neighborhood?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  bedrooms?: number;
  bathrooms?: number;
  featuredOnly?: boolean;
}

export interface PublicPropertiesPagination {
  page: number;
  limit: number;
}

const publishableListingInclude = {
  prices: {
    where: { isPrimary: true },
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.PropertyListingInclude;

export const publicListInclude = {
  ...propertyGeoInclude,
  images: {
    where: { isCover: true },
    take: 1,
  },
  listings: {
    where: { status: PropertyListingStatus.ACTIVE },
    include: publishableListingInclude,
  },
} satisfies Prisma.PropertyInclude;

export const publicDetailInclude = {
  ...propertyGeoInclude,
  images: {
    orderBy: [
      { isCover: 'desc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  listings: {
    where: { status: PropertyListingStatus.ACTIVE },
    include: publishableListingInclude,
  },
  featureAssignments: {
    include: {
      feature: true,
    },
  },
} satisfies Prisma.PropertyInclude;

export type FeaturedListingRecord = Prisma.PropertyListingGetPayload<{
  include: {
    prices: {
      where: { isPrimary: true };
      take: 1;
    };
    property: {
      include: {
        images: {
          where: { isCover: true };
          take: 1;
        };
      };
    };
  };
}>;

@Injectable()
export class PublicPropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyPublic(
    tenantId: string,
    filters: FindManyPublicPropertiesFilters,
    pagination: PublicPropertiesPagination,
  ) {
    const where = this.buildPublishablePropertyWhere(tenantId, filters);

    return Promise.all([
      this.prisma.property.findMany({
        where,
        include: publicListInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.property.count({ where }),
    ]);
  }

  findFeaturedPublic(tenantId: string, limit: number) {
    return this.prisma.propertyListing.findMany({
      where: {
        tenantId,
        status: PropertyListingStatus.ACTIVE,
        isFeatured: true,
        prices: { some: { isPrimary: true, tenantId } },
        property: {
          isActive: true,
          images: { some: { isCover: true, tenantId } },
        },
      },
      include: {
        prices: {
          where: { isPrimary: true },
          take: 1,
        },
        property: {
          include: {
            ...propertyGeoInclude,
            images: {
              where: { isCover: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  findBySlugPublic(tenantId: string, slug: string) {
    return this.prisma.property.findFirst({
      where: {
        tenantId,
        slug,
        isActive: true,
        images: { some: { isCover: true, tenantId } },
        listings: {
          some: this.buildPublishableListingWhere(tenantId),
        },
      },
      include: publicDetailInclude,
    });
  }

  private buildPublishableListingWhere(
    tenantId: string,
    filters: FindManyPublicPropertiesFilters = {},
  ): Prisma.PropertyListingWhereInput {
    const priceFilter: Prisma.PropertyPriceWhereInput = {
      isPrimary: true,
      tenantId,
    };

    if (filters.currency !== undefined) {
      priceFilter.currency = filters.currency;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      priceFilter.amount = {
        ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
        ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
      };
    }

    return {
      tenantId,
      status: PropertyListingStatus.ACTIVE,
      ...(filters.listingType !== undefined
        ? { listingType: filters.listingType }
        : {}),
      ...(filters.featuredOnly ? { isFeatured: true } : {}),
      prices: { some: priceFilter },
    };
  }

  private buildPublishablePropertyWhere(
    tenantId: string,
    filters: FindManyPublicPropertiesFilters = {},
  ): Prisma.PropertyWhereInput {
    const locationWhere = buildPropertyLocationWhere(filters);

    return {
      tenantId,
      isActive: true,
      images: { some: { isCover: true, tenantId } },
      listings: { some: this.buildPublishableListingWhere(tenantId, filters) },
      ...(filters.propertyType !== undefined
        ? { propertyType: filters.propertyType }
        : {}),
      ...locationWhere,
      ...(filters.bedrooms !== undefined
        ? { bedrooms: { gte: filters.bedrooms } }
        : {}),
      ...(filters.bathrooms !== undefined
        ? { bathrooms: { gte: filters.bathrooms } }
        : {}),
    };
  }
}

export type PublicPropertyListRecord = Prisma.PropertyGetPayload<{
  include: typeof publicListInclude;
}>;

export type PublicPropertyDetailRecord = Prisma.PropertyGetPayload<{
  include: typeof publicDetailInclude;
}>;
