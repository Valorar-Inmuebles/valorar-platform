import { Injectable } from '@nestjs/common';
import {
  Currency,
  DevelopmentStatus,
  Prisma,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEVELOPMENT_LIST_ORDER_BY } from '../../development/constants/list-order';
import { buildDevelopmentLocationWhere } from '../../development/utils/development-location-filters';
import { developmentGeoInclude } from '../../development/utils/development-location';

export interface FindManyPublicDevelopmentsFilters {
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  city?: string;
  neighborhood?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  status?: DevelopmentStatus;
}

export interface PublicDevelopmentsPagination {
  page: number;
  limit: number;
}

export const publicDevelopmentListInclude = {
  ...developmentGeoInclude,
  images: {
    where: { isCover: true },
    take: 1,
  },
} satisfies Prisma.DevelopmentInclude;

export const publicDevelopmentDetailInclude = {
  ...developmentGeoInclude,
  images: {
    orderBy: [
      { isCover: 'desc' as const },
      { sortOrder: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
  featureAssignments: {
    include: {
      feature: true,
    },
  },
  typologies: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      featureAssignments: {
        include: { feature: true },
      },
    },
  },
} satisfies Prisma.DevelopmentInclude;

@Injectable()
export class PublicDevelopmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyPublic(
    tenantId: string,
    filters: FindManyPublicDevelopmentsFilters,
    pagination: PublicDevelopmentsPagination,
  ) {
    const where = this.buildPublishableDevelopmentWhere(tenantId, filters);

    return Promise.all([
      this.prisma.development.findMany({
        where,
        include: publicDevelopmentListInclude,
        orderBy: DEVELOPMENT_LIST_ORDER_BY,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.development.count({ where }),
    ]);
  }

  findBySlugPublic(tenantId: string, slug: string) {
    return this.prisma.development.findFirst({
      where: {
        tenantId,
        slug,
        ...this.buildPublishableDevelopmentBaseWhere(tenantId),
      },
      include: publicDevelopmentDetailInclude,
    });
  }

  private buildPublishableDevelopmentBaseWhere(
    tenantId: string,
  ): Prisma.DevelopmentWhereInput {
    return {
      tenantId,
      isActive: true,
      images: { some: { isCover: true, tenantId } },
      title: { not: '' },
      shortDescription: { not: '' },
      description: { not: '' },
    };
  }

  private buildPublishableDevelopmentWhere(
    tenantId: string,
    filters: FindManyPublicDevelopmentsFilters = {},
  ): Prisma.DevelopmentWhereInput {
    const locationWhere = buildDevelopmentLocationWhere(filters);
    const priceFrom = this.buildPriceFromFilter(filters);

    return {
      ...this.buildPublishableDevelopmentBaseWhere(tenantId),
      ...(filters.status !== undefined ? { status: filters.status } : {}),
      ...locationWhere,
      ...(filters.currency !== undefined ? { currency: filters.currency } : {}),
      ...(priceFrom !== undefined ? { priceFrom } : {}),
    };
  }

  private buildPriceFromFilter(
    filters: FindManyPublicDevelopmentsFilters,
  ): Prisma.DecimalNullableFilter<'Development'> | undefined {
    if (filters.priceMin === undefined && filters.priceMax === undefined) {
      return undefined;
    }

    return {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }
}

export type PublicDevelopmentListRecord = Prisma.DevelopmentGetPayload<{
  include: typeof publicDevelopmentListInclude;
}>;

export type PublicDevelopmentDetailRecord = Prisma.DevelopmentGetPayload<{
  include: typeof publicDevelopmentDetailInclude;
}>;
