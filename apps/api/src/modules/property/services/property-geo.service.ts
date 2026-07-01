import { BadRequestException, Injectable } from '@nestjs/common';
import { GeoRepository } from '../../geo/repositories/geo.repository';

export type PropertyGeoInput = {
  countryId?: string | null;
  provinceId?: string | null;
  localityId?: string | null;
  neighborhoodId?: string | null;
};

export type ResolvedPropertyGeoWrite = {
  countryId: string | null;
  provinceId: string | null;
  localityId: string | null;
  neighborhoodId: string | null;
  country: string;
  province: string | null;
  city: string;
  neighborhood: string | null;
  postalCode?: string | null;
};

@Injectable()
export class PropertyGeoService {
  constructor(private readonly geoRepository: GeoRepository) {}

  async resolveForWrite(
    input: PropertyGeoInput,
    legacy: {
      country?: string;
      province?: string | null;
      city?: string;
      neighborhood?: string | null;
      postalCode?: string | null;
    },
  ): Promise<ResolvedPropertyGeoWrite> {
    if (!input.provinceId && !input.localityId && !input.neighborhoodId) {
      if (!legacy.city?.trim()) {
        throw new BadRequestException('city is required when geo locality is not set');
      }

      return {
        countryId: input.countryId ?? null,
        provinceId: null,
        localityId: null,
        neighborhoodId: null,
        country: legacy.country ?? 'AR',
        province: legacy.province ?? null,
        city: legacy.city.trim(),
        neighborhood: legacy.neighborhood ?? null,
        postalCode: legacy.postalCode,
      };
    }

    if (!input.provinceId || !input.localityId) {
      throw new BadRequestException(
        'provinceId and localityId are required when using geo catalog',
      );
    }

    const province = await this.geoRepository.findProvinceById(input.provinceId);

    if (!province) {
      throw new BadRequestException(
        `Province with id "${input.provinceId}" not found`,
      );
    }

    const locality = await this.geoRepository.findLocalityById(input.localityId);

    if (!locality || locality.provinceId !== province.id) {
      throw new BadRequestException(
        'localityId must belong to the selected province',
      );
    }

    let neighborhoodId: string | null = null;
    let neighborhoodName: string | null = null;

    if (input.neighborhoodId) {
      const neighborhood = await this.geoRepository.findNeighborhoodById(
        input.neighborhoodId,
      );

      if (!neighborhood || neighborhood.localityId !== locality.id) {
        throw new BadRequestException(
          'neighborhoodId must belong to the selected locality',
        );
      }

      neighborhoodId = neighborhood.id;
      neighborhoodName = neighborhood.name;
    } else if (input.neighborhoodId === null) {
      neighborhoodId = null;
      neighborhoodName = null;
    }

    const country = await this.geoRepository.findCountryById(province.countryId);
    const countryIso = country?.iso2 ?? legacy.country ?? 'AR';

    return {
      countryId: input.countryId ?? country?.id ?? null,
      provinceId: province.id,
      localityId: locality.id,
      neighborhoodId,
      country: countryIso,
      province: province.name,
      city: locality.name,
      neighborhood: neighborhoodName,
      postalCode: legacy.postalCode ?? locality.postalCode,
    };
  }
}
