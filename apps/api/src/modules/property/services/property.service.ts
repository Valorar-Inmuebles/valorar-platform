import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { ListingOperationalTrustService } from '../../property-listing/services/listing-operational-trust.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertyGeoService } from './property-geo.service';
import { PropertyAccessService } from './property-access.service';
import { PropertyRepository } from '../repositories/property.repository';
import {
  mapLocationEnrichmentFields,
  resolveProvince,
} from '../utils/location-fields';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly propertyListingRepository: PropertyListingRepository,
    private readonly listingOperationalTrustService: ListingOperationalTrustService,
    private readonly propertyGeoService: PropertyGeoService,
    private readonly propertyAccessService: PropertyAccessService,
  ) {}

  async create(
    dto: CreatePropertyDto,
    tenantId: string,
    createdById: string,
  ): Promise<PropertyResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertCreatedByBelongsToTenant(createdById, tenantId);
    await this.assertSlugIsUnique(dto.slug, tenantId);

    const internalCode = this.normalizeInternalCode(dto.internalCode);
    await this.assertInternalCodeIsUnique(internalCode, tenantId);

    const property = await this.propertyRepository.create(
      await this.toCreateData(dto, tenantId, createdById, internalCode),
    );

    return PropertyResponseDto.fromEntity(property);
  }

  async findAll(
    tenantId: string,
    user: AuthenticatedUser,
    isActive?: boolean,
  ): Promise<PropertyResponseDto[]> {
    const where = this.propertyAccessService.buildListWhere(tenantId, user, {
      ...(isActive !== undefined ? { isActive } : {}),
    });

    const properties = await this.propertyRepository.findMany(tenantId, {
      where,
    });

    return properties.map(PropertyResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
    user: AuthenticatedUser,
  ): Promise<PropertyResponseDto> {
    const property = await this.propertyRepository.findById(id, tenantId);

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    await this.propertyAccessService.assertCanViewProperty(
      {
        id: property.id,
        tenantId: property.tenantId,
        createdById: property.createdById,
        assignedToId: property.assignedToId,
      },
      user,
    );

    return PropertyResponseDto.fromEntity(property);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePropertyDto,
    user: AuthenticatedUser,
  ): Promise<PropertyResponseDto> {
    const existing = await this.propertyRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    await this.propertyAccessService.assertCanEditProperty(
      {
        id: existing.id,
        tenantId: existing.tenantId,
        createdById: existing.createdById,
        assignedToId: existing.assignedToId,
      },
      user,
    );

    if (dto.slug !== undefined) {
      if (dto.slug !== existing.slug) {
        const hasActiveListing =
          await this.propertyListingRepository.hasActiveListingForProperty(
            id,
            tenantId,
          );

        if (hasActiveListing) {
          throw new BadRequestException(
            'Cannot change slug while the property has an active listing. Pause or close listings first.',
          );
        }
      }

      await this.assertSlugIsUnique(dto.slug, tenantId, id);
    }

    const internalCode =
      dto.internalCode !== undefined
        ? this.normalizeInternalCode(dto.internalCode)
        : undefined;

    if (internalCode) {
      await this.assertInternalCodeIsUnique(internalCode, tenantId, id);
    }

    const property = await this.propertyRepository.update(
      id,
      tenantId,
      await this.toUpdateData(dto, internalCode),
    );

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    if (dto.isActive === false) {
      await this.listingOperationalTrustService.syncActiveListingsAfterDegradation(
        id,
        tenantId,
      );
    }

    return PropertyResponseDto.fromEntity(property);
  }

  async remove(
    id: string,
    tenantId: string,
    user: AuthenticatedUser,
  ): Promise<PropertyResponseDto> {
    const existing = await this.propertyRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    await this.propertyAccessService.assertCanEditProperty(
      {
        id: existing.id,
        tenantId: existing.tenantId,
        createdById: existing.createdById,
        assignedToId: existing.assignedToId,
      },
      user,
    );

    const property = await this.propertyRepository.softArchive(id, tenantId);

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    await this.listingOperationalTrustService.syncActiveListingsAfterDegradation(
      id,
      tenantId,
    );

    return PropertyResponseDto.fromEntity(property);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.propertyRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
  }

  private async assertCreatedByBelongsToTenant(
    createdById: string,
    tenantId: string,
  ): Promise<void> {
    const belongs = await this.propertyRepository.userBelongsToTenant(
      createdById,
      tenantId,
    );

    if (!belongs) {
      throw new BadRequestException(
        'createdById must belong to the same tenant',
      );
    }
  }

  private async assertSlugIsUnique(
    slug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.propertyRepository.findBySlug(slug, tenantId);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Property with slug "${slug}" already exists for this tenant`,
      );
    }
  }

  private async assertInternalCodeIsUnique(
    internalCode: string | null | undefined,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    if (!internalCode) {
      return;
    }

    const existing = await this.propertyRepository.findByInternalCode(
      internalCode,
      tenantId,
    );

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Property with internalCode "${internalCode}" already exists for this tenant`,
      );
    }
  }

  private async toCreateData(
    dto: CreatePropertyDto,
    tenantId: string,
    createdById: string,
    internalCode: string | null | undefined,
  ) {
    const location = await this.propertyGeoService.resolveForWrite(
      {
        countryId: dto.countryId,
        provinceId: dto.provinceId,
        localityId: dto.localityId,
        neighborhoodId: dto.neighborhoodId,
      },
      {
        country: dto.country,
        province: resolveProvince(dto),
        city: dto.city,
        neighborhood: dto.neighborhood,
        postalCode: dto.postalCode,
      },
    );

    return {
      tenantId,
      createdById,
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      internalCode: internalCode ?? null,
      propertyType: dto.propertyType,
      condition: dto.condition,
      isActive: dto.isActive ?? true,
      street: dto.street,
      streetNumber: dto.streetNumber,
      floor: dto.floor,
      apartment: dto.apartment,
      neighborhood: location.neighborhood,
      city: location.city,
      province: location.province,
      country: location.country,
      countryId: location.countryId,
      provinceId: location.provinceId,
      localityId: location.localityId,
      neighborhoodId: location.neighborhoodId,
      postalCode: location.postalCode ?? dto.postalCode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      ...mapLocationEnrichmentFields(dto),
      totalArea: dto.totalArea,
      coveredArea: dto.coveredArea,
      uncoveredArea: dto.uncoveredArea,
      lotFront: dto.lotFront,
      lotDepth: dto.lotDepth,
      rooms: dto.rooms,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      halfBathrooms: dto.halfBathrooms,
      parkingSpaces: dto.parkingSpaces,
      yearBuilt: dto.yearBuilt,
      orientation: dto.orientation,
      layout: dto.layout,
      brightness: dto.brightness,
    };
  }

  private async toUpdateData(
    dto: UpdatePropertyDto,
    internalCode: string | null | undefined,
  ) {
    const hasGeoInput =
      dto.countryId !== undefined ||
      dto.provinceId !== undefined ||
      dto.localityId !== undefined ||
      dto.neighborhoodId !== undefined;

    let locationPatch: Awaited<
      ReturnType<PropertyGeoService['resolveForWrite']>
    > | null = null;

    if (hasGeoInput) {
      locationPatch = await this.propertyGeoService.resolveForWrite(
        {
          countryId: dto.countryId,
          provinceId: dto.provinceId,
          localityId: dto.localityId,
          neighborhoodId: dto.neighborhoodId ?? null,
        },
        {
          country: dto.country,
          province: resolveProvince(dto),
          city: dto.city,
          neighborhood: dto.neighborhood ?? null,
          postalCode: dto.postalCode,
        },
      );
    }

    return {
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(internalCode !== undefined ? { internalCode } : {}),
      ...(dto.propertyType !== undefined
        ? { propertyType: dto.propertyType }
        : {}),
      ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.street !== undefined ? { street: dto.street } : {}),
      ...(dto.streetNumber !== undefined
        ? { streetNumber: dto.streetNumber }
        : {}),
      ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
      ...(dto.apartment !== undefined ? { apartment: dto.apartment } : {}),
      ...(locationPatch
        ? {
            neighborhood: locationPatch.neighborhood,
            city: locationPatch.city,
            province: locationPatch.province,
            country: locationPatch.country,
            countryId: locationPatch.countryId,
            provinceId: locationPatch.provinceId,
            localityId: locationPatch.localityId,
            neighborhoodId: locationPatch.neighborhoodId,
            ...(locationPatch.postalCode !== undefined
              ? { postalCode: locationPatch.postalCode }
              : {}),
          }
        : {
            ...(dto.neighborhood !== undefined
              ? { neighborhood: dto.neighborhood }
              : {}),
            ...(dto.city !== undefined ? { city: dto.city } : {}),
            ...(resolveProvince(dto) !== undefined
              ? { province: resolveProvince(dto) }
              : {}),
            ...(dto.country !== undefined ? { country: dto.country } : {}),
            ...(dto.postalCode !== undefined
              ? { postalCode: dto.postalCode }
              : {}),
          }),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...mapLocationEnrichmentFields(dto),
      ...(dto.totalArea !== undefined ? { totalArea: dto.totalArea } : {}),
      ...(dto.coveredArea !== undefined
        ? { coveredArea: dto.coveredArea }
        : {}),
      ...(dto.uncoveredArea !== undefined
        ? { uncoveredArea: dto.uncoveredArea }
        : {}),
      ...(dto.lotFront !== undefined ? { lotFront: dto.lotFront } : {}),
      ...(dto.lotDepth !== undefined ? { lotDepth: dto.lotDepth } : {}),
      ...(dto.rooms !== undefined ? { rooms: dto.rooms } : {}),
      ...(dto.bedrooms !== undefined ? { bedrooms: dto.bedrooms } : {}),
      ...(dto.bathrooms !== undefined ? { bathrooms: dto.bathrooms } : {}),
      ...(dto.halfBathrooms !== undefined
        ? { halfBathrooms: dto.halfBathrooms }
        : {}),
      ...(dto.parkingSpaces !== undefined
        ? { parkingSpaces: dto.parkingSpaces }
        : {}),
      ...(dto.yearBuilt !== undefined ? { yearBuilt: dto.yearBuilt } : {}),
      ...(dto.orientation !== undefined
        ? { orientation: dto.orientation }
        : {}),
      ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
      ...(dto.brightness !== undefined ? { brightness: dto.brightness } : {}),
    };
  }

  private normalizeInternalCode(
    internalCode: string | undefined,
  ): string | null | undefined {
    if (internalCode === undefined) {
      return undefined;
    }

    const trimmed = internalCode.trim();

    return trimmed.length > 0 ? trimmed : null;
  }
}
