import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDevelopmentDto } from '../dto/create-development.dto';
import { DevelopmentResponseDto } from '../dto/development-response.dto';
import { UpdateDevelopmentDto } from '../dto/update-development.dto';
import { DevelopmentGeoService } from './development-geo.service';
import { DevelopmentRepository } from '../repositories/development.repository';
import {
  mapLocationEnrichmentFields,
  resolveProvince,
} from '../../property/utils/location-fields';

@Injectable()
export class DevelopmentService {
  constructor(
    private readonly developmentRepository: DevelopmentRepository,
    private readonly developmentGeoService: DevelopmentGeoService,
  ) {}

  async create(
    dto: CreateDevelopmentDto,
    tenantId: string,
    createdById: string,
  ): Promise<DevelopmentResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertCreatedByBelongsToTenant(createdById, tenantId);
    await this.assertSlugIsUnique(dto.slug, tenantId);

    const internalCode = this.normalizeInternalCode(dto.internalCode);
    await this.assertInternalCodeIsUnique(internalCode, tenantId);

    const development = await this.developmentRepository.create(
      await this.toCreateData(dto, tenantId, createdById, internalCode),
    );

    return DevelopmentResponseDto.fromEntity(development);
  }

  async findAll(
    tenantId: string,
    isActive?: boolean,
  ): Promise<DevelopmentResponseDto[]> {
    const developments = await this.developmentRepository.findMany(tenantId, {
      ...(isActive !== undefined ? { isActive } : {}),
    });

    return developments.map(DevelopmentResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentResponseDto> {
    const development = await this.developmentRepository.findById(id, tenantId);

    if (!development) {
      throw new NotFoundException(`Development with id "${id}" not found`);
    }

    return DevelopmentResponseDto.fromEntity(development);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateDevelopmentDto,
  ): Promise<DevelopmentResponseDto> {
    const existing = await this.developmentRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Development with id "${id}" not found`);
    }

    if (dto.slug !== undefined) {
      await this.assertSlugIsUnique(dto.slug, tenantId, id);
    }

    const internalCode =
      dto.internalCode !== undefined
        ? this.normalizeInternalCode(dto.internalCode)
        : undefined;

    if (internalCode) {
      await this.assertInternalCodeIsUnique(internalCode, tenantId, id);
    }

    if (dto.hasFinancing === false) {
      dto.financingDescription = null;
    }

    if (dto.hasParkingSpaces === false) {
      dto.parkingSpacesCount = null;
    }

    const development = await this.developmentRepository.update(
      id,
      tenantId,
      await this.toUpdateData(dto, internalCode),
    );

    if (!development) {
      throw new NotFoundException(`Development with id "${id}" not found`);
    }

    return DevelopmentResponseDto.fromEntity(development);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentResponseDto> {
    const existing = await this.developmentRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Development with id "${id}" not found`);
    }

    const development = await this.developmentRepository.softArchive(
      id,
      tenantId,
    );

    if (!development) {
      throw new NotFoundException(`Development with id "${id}" not found`);
    }

    return DevelopmentResponseDto.fromEntity(development);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.developmentRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
  }

  private async assertCreatedByBelongsToTenant(
    createdById: string,
    tenantId: string,
  ): Promise<void> {
    const belongs = await this.developmentRepository.userBelongsToTenant(
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
    const existing = await this.developmentRepository.findBySlug(slug, tenantId);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Development with slug "${slug}" already exists for this tenant`,
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

    const existing = await this.developmentRepository.findByInternalCode(
      internalCode,
      tenantId,
    );

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Development with internalCode "${internalCode}" already exists for this tenant`,
      );
    }
  }

  private async toCreateData(
    dto: CreateDevelopmentDto,
    tenantId: string,
    createdById: string,
    internalCode: string | null | undefined,
  ) {
    const location = await this.developmentGeoService.resolveForWrite(
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
      shortDescription: dto.shortDescription,
      description: dto.description,
      status: dto.status ?? null,
      internalCode: internalCode ?? null,
      isActive: dto.isActive ?? true,
      street: dto.street,
      streetNumber: dto.streetNumber,
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
      hasParkingSpaces: dto.hasParkingSpaces ?? false,
      parkingSpacesCount:
        dto.hasParkingSpaces === true ? (dto.parkingSpacesCount ?? null) : null,
      ...mapLocationEnrichmentFields(dto),
    };
  }

  private async toUpdateData(
    dto: UpdateDevelopmentDto,
    internalCode: string | null | undefined,
  ) {
    const hasGeoInput =
      dto.countryId !== undefined ||
      dto.provinceId !== undefined ||
      dto.localityId !== undefined ||
      dto.neighborhoodId !== undefined;

    let locationPatch: Awaited<
      ReturnType<DevelopmentGeoService['resolveForWrite']>
    > | null = null;

    if (hasGeoInput) {
      locationPatch = await this.developmentGeoService.resolveForWrite(
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
      ...(dto.shortDescription !== undefined
        ? { shortDescription: dto.shortDescription }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(internalCode !== undefined ? { internalCode } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.street !== undefined ? { street: dto.street } : {}),
      ...(dto.streetNumber !== undefined
        ? { streetNumber: dto.streetNumber }
        : {}),
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
      ...(dto.priceFrom !== undefined ? { priceFrom: dto.priceFrom } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.hasFinancing !== undefined
        ? { hasFinancing: dto.hasFinancing }
        : {}),
      ...(dto.financingDescription !== undefined
        ? { financingDescription: dto.financingDescription }
        : {}),
      ...(dto.hasParkingSpaces !== undefined
        ? { hasParkingSpaces: dto.hasParkingSpaces }
        : {}),
      ...(dto.parkingSpacesCount !== undefined
        ? { parkingSpacesCount: dto.parkingSpacesCount }
        : {}),
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
