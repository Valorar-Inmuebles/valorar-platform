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
  featureSlugs?: string[];
  featuredOnly?: boolean;
}

export interface PublicPropertiesPagination {
  page: number;
  limit: number;
}

/** Listing statuses visible on the public web. */
export const PUBLIC_WEB_LISTING_STATUSES: PropertyListingStatus[] = [
  PropertyListingStatus.ACTIVE,
  PropertyListingStatus.RESERVED,
];

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
    where: { status: { in: PUBLIC_WEB_LISTING_STATUSES } },
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
    where: { status: { in: PUBLIC_WEB_LISTING_STATUSES } },
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

  /**
   * Web-visible listing rule:
   * - ACTIVE requires primary price
   * - RESERVED may omit price (“Consultar precio”)
   * - Price range / currency filters always require a matching primary price
   *   (priceless listings are excluded from range filters)
   *
   * Sort note: Public list order is `Property.updatedAt desc` (no price sort).
   * If price sorting is added later, null primary prices must sort last.
   */
  private buildPublishableListingWhere(
    tenantId: string,
    filters: FindManyPublicPropertiesFilters = {},
  ): Prisma.PropertyListingWhereInput {
    const listingTypeFilter =
      filters.listingType !== undefined
        ? { listingType: filters.listingType }
        : {};
    const featuredFilter = filters.featuredOnly ? { isFeatured: true } : {};

    const primaryPriceBase: Prisma.PropertyPriceWhereInput = {
      isPrimary: true,
      tenantId,
    };

    const hasPriceConstraint =
      filters.currency !== undefined ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined;

    if (hasPriceConstraint) {
      const priceFilter: Prisma.PropertyPriceWhereInput = {
        ...primaryPriceBase,
        ...(filters.currency !== undefined
          ? { currency: filters.currency }
          : {}),
        ...(filters.priceMin !== undefined || filters.priceMax !== undefined
          ? {
              amount: {
                ...(filters.priceMin !== undefined
                  ? { gte: filters.priceMin }
                  : {}),
                ...(filters.priceMax !== undefined
                  ? { lte: filters.priceMax }
                  : {}),
              },
            }
          : {}),
      };

      return {
        tenantId,
        status: { in: PUBLIC_WEB_LISTING_STATUSES },
        ...listingTypeFilter,
        ...featuredFilter,
        prices: { some: priceFilter },
      };
    }

    return {
      tenantId,
      ...listingTypeFilter,
      ...featuredFilter,
      OR: [
        {
          status: PropertyListingStatus.ACTIVE,
          prices: { some: primaryPriceBase },
        },
        {
          status: PropertyListingStatus.RESERVED,
        },
      ],
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
      ...(filters.featureSlugs && filters.featureSlugs.length > 0
        ? {
            AND: filters.featureSlugs.map((slug) => ({
              featureAssignments: {
                some: {
                  tenantId,
                  feature: {
                    slug,
                    isActive: true,
                  },
                },
              },
            })),
          }
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
