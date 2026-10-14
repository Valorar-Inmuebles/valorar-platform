import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { GeoRepository } from '../../geo/repositories/geo.repository';
import { PropertyAccessService } from './property-access.service';
import { PropertyRepository } from '../repositories/property.repository';
import type {
  PropertyLocationSearchDto,
  LocationSearchResult,
} from '../dto/property-location-search.dto';
import { GeoapifyAdapter } from './geoapify.adapter';

@Injectable()
export class PropertyLocationSearchService {
  private readonly admissions = new Map<string, number[]>();
  constructor(
    private readonly geo: GeoRepository,
    private readonly properties: PropertyRepository,
    private readonly access: PropertyAccessService,
    private readonly provider: GeoapifyAdapter,
  ) {}

  async search(
    dto: PropertyLocationSearchDto,
    tenantId: string,
    user: AuthenticatedUser,
    propertyId?: string,
  ): Promise<LocationSearchResult> {
    if (process.env.VALORAR_DATABASE_ENV === 'realdata')
      throw new NotFoundException();
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== tenantId)
      throw new NotFoundException();
    if (dto.country !== 'AR')
      throw new BadRequestException(
        'La búsqueda está disponible sólo en Argentina.',
      );
    if (propertyId) {
      const property = await this.properties.findById(propertyId, tenantId);
      if (!property) throw new NotFoundException('Property not found');
      await this.access.assertCanEditProperty(property, user);
    }
    const street = dto.street?.trim();
    if (!street || street.length < 2 || !/[\p{L}]/u.test(street))
      throw new BadRequestException('Ingresá una calle válida.');
    if ((dto.provinceId !== undefined) !== (dto.localityId !== undefined))
      throw new BadRequestException('Seleccioná provincia y localidad.');
    let province = dto.province?.trim();
    let city = dto.city?.trim();
    let neighborhood = dto.neighborhood?.trim();
    if (dto.provinceId && dto.localityId) {
      const [selectedProvince, locality, barrio] = await Promise.all([
        this.geo.findProvinceById(dto.provinceId),
        this.geo.findLocalityById(dto.localityId),
        dto.neighborhoodId
          ? this.geo.findNeighborhoodById(dto.neighborhoodId)
          : Promise.resolve(null),
      ]);
      if (
        !selectedProvince ||
        !locality ||
        locality.provinceId !== selectedProvince.id ||
        (dto.neighborhoodId && (!barrio || barrio.localityId !== locality.id))
      )
        throw new BadRequestException('Ubicación geográfica inválida.');
      const country = await this.geo.findCountryById(
        selectedProvince.countryId,
      );
      if (country?.iso2 !== 'AR')
        throw new BadRequestException(
          'La búsqueda está disponible sólo en Argentina.',
        );
      province = selectedProvince.name;
      city = locality.name;
      neighborhood = barrio?.name;
    } else if (dto.neighborhoodId)
      throw new BadRequestException('Seleccioná provincia y localidad.');
    if (!province || !city)
      throw new BadRequestException(
        'Ingresá provincia y localidad para buscar.',
      );
    const caba =
      /^(capital federal|ciudad aut[oó]noma de buenos aires|caba)$/i.test(
        province,
      );
    const query = [
      street + (dto.streetNumber?.trim() ? ` ${dto.streetNumber.trim()}` : ''),
      ...(caba
        ? [city, 'Ciudad Autónoma de Buenos Aires']
        : [neighborhood, city, province]),
      dto.postalCode?.trim(),
      'Argentina',
    ]
      .filter(Boolean)
      .join(', ');
    if (query.length > 450)
      throw new BadRequestException('La dirección es demasiado larga.');
    this.admit(tenantId, user.id);
    return this.provider.search(query, dto.streetNumber?.trim());
  }

  private admit(tenantId: string, userId: string): void {
    // Bounded per-process courtesy limits; not a distributed quota or persistent cache.
    const now = Date.now();
    const limits: Array<[string, number, number]> = [
      [`user:${tenantId}:${userId}`, 5, 60_000],
      [`tenant:${tenantId}`, 60, 60_000],
      ['global', 300, 86_400_000],
    ];
    for (const [key, max, window] of limits) {
      const active = (this.admissions.get(key) ?? []).filter(
        (time) => time > now - window,
      );
      if (active.length >= max) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((active[0] + window - now) / 1000),
        );
        throw new HttpException(
          {
            code: 'GEOCODING_RATE_LIMIT',
            message: 'Demasiadas búsquedas. Intentá más tarde.',
            retryAfterSeconds,
          },
          429,
        );
      }
    }
    // Evict stale tenant/user windows before inserting new identities.
    for (const [key, attempts] of this.admissions) {
      const window = key === 'global' ? 86_400_000 : 60_000;
      if (attempts.at(-1)! <= now - window) this.admissions.delete(key);
    }
    if (this.admissions.size >= 2000)
      throw new ServiceUnavailableException(
        'Búsqueda temporalmente no disponible.',
      );
    for (const [key, , window] of limits)
      this.admissions.set(key, [
        ...(this.admissions.get(key) ?? []).filter(
          (time) => time > now - window,
        ),
        now,
      ]);
  }
}
