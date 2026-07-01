import { Injectable } from '@nestjs/common';
import { createSearch } from '@repo/geo-text';
import {
  Country,
  Locality,
  Neighborhood,
  Prisma,
  Province,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type SearchLocalitiesParams = {
  provinceId?: string;
  search?: string;
  limit?: number;
};

@Injectable()
export class GeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCountries(): Promise<Country[]> {
    return this.prisma.country.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findCountryById(id: string): Promise<Country | null> {
    return this.prisma.country.findUnique({
      where: { id },
    });
  }

  findCountryByIso2(iso2: string): Promise<Country | null> {
    return this.prisma.country.findUnique({
      where: { iso2: iso2.toUpperCase() },
    });
  }

  findProvinces(): Promise<Province[]> {
    return this.prisma.province.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findProvinceById(id: string): Promise<Province | null> {
    return this.prisma.province.findUnique({
      where: { id },
    });
  }

  findLocalitiesByProvinceId(
    provinceId: string,
    search?: string,
    limit = 50,
  ): Promise<Locality[]> {
    const normalizedSearch = search ? createSearch(search) : undefined;
    const where: Prisma.LocalityWhereInput = {
      provinceId,
      ...(normalizedSearch
        ? {
            search: { contains: normalizedSearch, mode: 'insensitive' },
          }
        : {}),
    };

    return this.prisma.locality.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
    });
  }

  searchLocalities(params: SearchLocalitiesParams): Promise<
    Array<
      Locality & {
        province: Pick<Province, 'id' | 'name' | 'slug'>;
      }
    >
  > {
    const { provinceId, search, limit = 20 } = params;

    if (!search?.trim()) {
      return Promise.resolve([]);
    }

    const normalizedSearch = createSearch(search);

    return this.prisma.locality.findMany({
      where: {
        ...(provinceId ? { provinceId } : {}),
        search: { contains: normalizedSearch, mode: 'insensitive' },
      },
      include: {
        province: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ province: { name: 'asc' } }, { name: 'asc' }],
      take: limit,
    });
  }

  findLocalityById(id: string): Promise<Locality | null> {
    return this.prisma.locality.findUnique({
      where: { id },
    });
  }

  findNeighborhoodsByLocalityId(
    localityId: string,
    search?: string,
    limit = 50,
  ): Promise<Neighborhood[]> {
    const normalizedSearch = search ? createSearch(search) : undefined;
    const where: Prisma.NeighborhoodWhereInput = {
      localityId,
      ...(normalizedSearch
        ? {
            search: { contains: normalizedSearch, mode: 'insensitive' },
          }
        : {}),
    };

    return this.prisma.neighborhood.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
    });
  }

  findNeighborhoodById(id: string): Promise<Neighborhood | null> {
    return this.prisma.neighborhood.findUnique({
      where: { id },
    });
  }
}
