import { Injectable, NotFoundException } from '@nestjs/common';

import { LocalitySearchResultDto } from '../dto/geo-search.dto';
import { LocalityResponseDto } from '../dto/locality-response.dto';
import { NeighborhoodResponseDto } from '../dto/neighborhood-response.dto';
import { ProvinceResponseDto } from '../dto/province-response.dto';
import { GeoRepository } from '../repositories/geo.repository';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const PROVINCES_TTL_MS = 5 * 60 * 1000;
const LOCALITIES_TTL_MS = 2 * 60 * 1000;
const NEIGHBORHOODS_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class GeoService {
  private provincesCache: CacheEntry<ProvinceResponseDto[]> | null = null;
  private localitiesCache = new Map<string, CacheEntry<LocalityResponseDto[]>>();
  private neighborhoodsCache = new Map<
    string,
    CacheEntry<NeighborhoodResponseDto[]>
  >();

  constructor(private readonly geoRepository: GeoRepository) {}

  async findProvinces(): Promise<ProvinceResponseDto[]> {
    if (this.provincesCache && this.provincesCache.expiresAt > Date.now()) {
      return this.provincesCache.value;
    }

    const provinces = await this.geoRepository.findProvinces();
    const value = provinces.map(ProvinceResponseDto.fromEntity);

    this.provincesCache = {
      value,
      expiresAt: Date.now() + PROVINCES_TTL_MS,
    };

    return value;
  }

  async findLocalitiesByProvinceId(
    provinceId: string,
    search?: string,
    limit = 50,
  ): Promise<LocalityResponseDto[]> {
    const province = await this.geoRepository.findProvinceById(provinceId);

    if (!province) {
      throw new NotFoundException(`Province with id "${provinceId}" not found`);
    }

    const cacheKey = `${provinceId}:${search ?? ''}:${limit}`;

    if (!search) {
      const cached = this.localitiesCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const localities = await this.geoRepository.findLocalitiesByProvinceId(
      provinceId,
      search,
      limit,
    );

    const value = localities.map(LocalityResponseDto.fromEntity);

    if (!search) {
      this.localitiesCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + LOCALITIES_TTL_MS,
      });
    }

    return value;
  }

  async searchLocalities(
    query: string,
    provinceId?: string,
    limit = 20,
  ): Promise<LocalitySearchResultDto[]> {
    const localities = await this.geoRepository.searchLocalities({
      search: query,
      provinceId,
      limit,
    });

    return localities.map((locality) => ({
      id: locality.id,
      provinceId: locality.provinceId,
      provinceName: locality.province.name,
      name: locality.name,
      slug: locality.slug,
      postalCode: locality.postalCode,
    }));
  }

  async findNeighborhoodsByLocalityId(
    localityId: string,
    search?: string,
    limit = 50,
  ): Promise<NeighborhoodResponseDto[]> {
    const locality = await this.geoRepository.findLocalityById(localityId);

    if (!locality) {
      throw new NotFoundException(`Locality with id "${localityId}" not found`);
    }

    const cacheKey = `${localityId}:${search ?? ''}:${limit}`;

    if (!search) {
      const cached = this.neighborhoodsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    const neighborhoods = await this.geoRepository.findNeighborhoodsByLocalityId(
      localityId,
      search,
      limit,
    );

    const value = neighborhoods.map(NeighborhoodResponseDto.fromEntity);

    if (!search) {
      this.neighborhoodsCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + NEIGHBORHOODS_TTL_MS,
      });
    }

    return value;
  }
}
