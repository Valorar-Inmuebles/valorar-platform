import { Injectable, NotFoundException } from '@nestjs/common';
import { isDevelopmentFeatureCategory } from '../../development/constants/development-feature-categories';
import { isAllowedTypologyFeatureSlug } from '../../development/constants/typology-feature-slugs';
import { DevelopmentImage } from '../../../../generated/prisma/client';
import {
  resolveDevelopmentLocation,
  DevelopmentWithGeoRelations,
} from '../../development/utils/development-location';
import { ListPublicDevelopmentsQueryDto } from '../dto/public-development-query.dto';
import {
  PublicDevelopmentCardDto,
  PublicDevelopmentCommercializationDto,
  PublicDevelopmentCoverImageDto,
  PublicDevelopmentDetailDto,
  PublicDevelopmentFeatureDto,
  PublicDevelopmentImageDto,
  PublicDevelopmentListResponseDto,
  PublicDevelopmentTypologyDto,
} from '../dto/public-development-response.dto';
import {
  PublicDevelopmentDetailRecord,
  PublicDevelopmentListRecord,
  PublicDevelopmentRepository,
} from '../repositories/public-development.repository';

@Injectable()
export class PublicDevelopmentService {
  constructor(
    private readonly publicDevelopmentRepository: PublicDevelopmentRepository,
  ) {}

  async findAll(
    query: ListPublicDevelopmentsQueryDto,
  ): Promise<PublicDevelopmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [developments, total] =
      await this.publicDevelopmentRepository.findManyPublic(
        query.tenantId,
        {
          provinceId: query.provinceId,
          localityId: query.localityId,
          neighborhoodId: query.neighborhoodId,
          city: query.city,
          neighborhood: query.neighborhood,
          priceMin: query.priceMin,
          priceMax: query.priceMax,
          currency: query.currency,
          status: query.status,
        },
        { page, limit },
      );

    const data = developments
      .map((development) => this.toCardDto(development))
      .filter((card): card is PublicDevelopmentCardDto => card !== null);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(
    slug: string,
    tenantId: string,
  ): Promise<PublicDevelopmentDetailDto> {
    const development =
      await this.publicDevelopmentRepository.findBySlugPublic(tenantId, slug);

    if (!development) {
      throw new NotFoundException(
        `Public development with slug "${slug}" not found`,
      );
    }

    return this.toDetailDto(development);
  }

  private toCardDto(
    development: PublicDevelopmentListRecord,
  ): PublicDevelopmentCardDto | null {
    const coverImage = development.images[0];

    if (!coverImage || !this.hasPublishableContent(development)) {
      return null;
    }

    const location = resolveDevelopmentLocation(development);

    return {
      id: development.id,
      slug: development.slug,
      title: development.title,
      shortDescription: development.shortDescription,
      status: development.status,
      city: location.city,
      neighborhood: location.neighborhood,
      provinceId: location.provinceId,
      provinceName: location.provinceName,
      localityId: location.localityId,
      localityName: location.localityName,
      neighborhoodId: location.neighborhoodId,
      neighborhoodName: location.neighborhoodName,
      coverImage: this.toCoverImageDto(coverImage),
      priceFrom:
        development.priceFrom != null ? Number(development.priceFrom) : null,
      currency: development.currency,
    };
  }

  private toDetailDto(
    development: PublicDevelopmentDetailRecord,
  ): PublicDevelopmentDetailDto {
    const coverImage = development.images.find((image) => image.isCover);

    if (!coverImage || !this.hasPublishableContent(development)) {
      throw new NotFoundException(
        `Public development with slug "${development.slug}" is not publishable`,
      );
    }

    const location = resolveDevelopmentLocation(development);

    return {
      id: development.id,
      slug: development.slug,
      title: development.title,
      shortDescription: development.shortDescription,
      description: development.description,
      status: development.status,
      city: location.city,
      neighborhood: location.neighborhood,
      province: location.province,
      country: location.country,
      provinceId: location.provinceId,
      provinceName: location.provinceName,
      localityId: location.localityId,
      localityName: location.localityName,
      neighborhoodId: location.neighborhoodId,
      neighborhoodName: location.neighborhoodName,
      latitude:
        development.latitude != null ? Number(development.latitude) : null,
      longitude:
        development.longitude != null ? Number(development.longitude) : null,
      coverImage: this.toCoverImageDto(coverImage),
      commercialization: this.toCommercializationDto(development),
      gallery: development.images.map(this.toGalleryImageDto),
      features: development.featureAssignments
        .filter(
          (assignment) =>
            assignment.feature.isActive &&
            isDevelopmentFeatureCategory(assignment.feature.category),
        )
        .map(this.toFeatureDto),
      typologies: development.typologies.map(this.toTypologyDto),
    };
  }

  private hasPublishableContent(
    development: Pick<
      DevelopmentWithGeoRelations,
      'title' | 'shortDescription' | 'description'
    >,
  ): boolean {
    return (
      development.title.trim().length > 0 &&
      development.shortDescription.trim().length > 0 &&
      development.description.trim().length > 0
    );
  }

  private toCoverImageDto(image: DevelopmentImage): PublicDevelopmentCoverImageDto {
    return {
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText,
    };
  }

  private toGalleryImageDto(
    image: DevelopmentImage,
  ): PublicDevelopmentImageDto {
    return {
      id: image.id,
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isCover: image.isCover,
    };
  }

  private toCommercializationDto(
    development: PublicDevelopmentDetailRecord,
  ): PublicDevelopmentCommercializationDto {
    return {
      priceFrom:
        development.priceFrom != null ? Number(development.priceFrom) : null,
      currency: development.currency,
      hasFinancing: development.hasFinancing,
      financingDescription: development.financingDescription,
      hasParkingSpaces: development.hasParkingSpaces,
      parkingSpacesCount: development.parkingSpacesCount,
    };
  }

  private toFeatureDto(
    assignment: PublicDevelopmentDetailRecord['featureAssignments'][number],
  ): PublicDevelopmentFeatureDto {
    return {
      id: assignment.feature.id,
      name: assignment.feature.name,
      slug: assignment.feature.slug,
      category: assignment.feature.category,
      value: assignment.value,
    };
  }

  private toTypologyDto(
    typology: PublicDevelopmentDetailRecord['typologies'][number],
  ): PublicDevelopmentTypologyDto {
    return {
      id: typology.id,
      name: typology.name,
      description: typology.description,
      totalCount: typology.totalCount,
      availableCount: typology.availableCount,
      surfaceFrom:
        typology.surfaceFrom != null ? Number(typology.surfaceFrom) : null,
      surfaceTo:
        typology.surfaceTo != null ? Number(typology.surfaceTo) : null,
      priceFrom:
        typology.priceFrom != null ? Number(typology.priceFrom) : null,
      currency: typology.currency,
      sortOrder: typology.sortOrder,
      features: typology.featureAssignments
        .filter(
          (assignment) =>
            assignment.feature.isActive &&
            isAllowedTypologyFeatureSlug(assignment.feature.slug),
        )
        .map((assignment) => ({
          id: assignment.feature.id,
          name: assignment.feature.name,
          slug: assignment.feature.slug,
          category: assignment.feature.category,
          value: assignment.value,
        })),
    };
  }
}
