import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isTypologyFeatureCategory } from '../../development/constants/development-feature-categories';
import { isAllowedTypologyFeatureSlug } from '../../development/constants/typology-feature-slugs';
import { DevelopmentTypologyRepository } from '../../development-typology/repositories/development-typology.repository';
import { PropertyFeatureRepository } from '../../property-feature/repositories/property-feature.repository';
import { AssignDevelopmentTypologyFeatureDto } from '../dto/assign-development-typology-feature.dto';
import { DevelopmentTypologyFeatureAssignmentResponseDto } from '../dto/development-typology-feature-assignment-response.dto';
import { ReplaceDevelopmentTypologyFeatureAssignmentsDto } from '../dto/replace-development-typology-feature-assignments.dto';
import {
  DevelopmentTypologyFeatureAssignmentRepository,
  DevelopmentTypologyFeatureAssignmentWithFeature,
} from '../repositories/development-typology-feature-assignment.repository';

@Injectable()
export class DevelopmentTypologyFeatureAssignmentService {
  constructor(
    private readonly assignmentRepository: DevelopmentTypologyFeatureAssignmentRepository,
    private readonly typologyRepository: DevelopmentTypologyRepository,
    private readonly propertyFeatureRepository: PropertyFeatureRepository,
  ) {}

  async findAll(
    typologyId: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyFeatureAssignmentResponseDto[]> {
    await this.assertTypologyBelongsToTenant(typologyId, tenantId);

    const assignments = await this.assignmentRepository.findManyByTypology(
      typologyId,
      tenantId,
    );

    return assignments.map(this.toResponseDto);
  }

  async replaceAll(
    typologyId: string,
    tenantId: string,
    dto: ReplaceDevelopmentTypologyFeatureAssignmentsDto,
  ): Promise<DevelopmentTypologyFeatureAssignmentResponseDto[]> {
    await this.assertTypologyBelongsToTenant(typologyId, tenantId);
    await this.assertFeaturesAssignable(dto.features);

    const assignments = await this.assignmentRepository.replaceAll(
      typologyId,
      tenantId,
      dto.features.map((item) => ({
        featureId: item.featureId,
        value: item.value ?? null,
      })),
    );

    return assignments.map(this.toResponseDto);
  }

  async assign(
    typologyId: string,
    tenantId: string,
    dto: AssignDevelopmentTypologyFeatureDto,
  ): Promise<DevelopmentTypologyFeatureAssignmentResponseDto> {
    await this.assertTypologyBelongsToTenant(typologyId, tenantId);
    await this.assertFeatureAssignable(dto.featureId);

    const existing = await this.assignmentRepository.findByTypologyAndFeature(
      typologyId,
      dto.featureId,
      tenantId,
    );

    if (existing) {
      throw new ConflictException(
        `Feature "${dto.featureId}" is already assigned to this typology`,
      );
    }

    const assignment = await this.assignmentRepository.create(
      typologyId,
      tenantId,
      dto.featureId,
      dto.value ?? null,
    );

    return this.toResponseDto(assignment);
  }

  async unassign(
    typologyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyFeatureAssignmentResponseDto> {
    await this.assertTypologyBelongsToTenant(typologyId, tenantId);

    const removed = await this.assignmentRepository.deleteByTypologyAndFeature(
      typologyId,
      featureId,
      tenantId,
    );

    if (!removed) {
      throw new NotFoundException(
        `Feature assignment for feature "${featureId}" not found on this typology`,
      );
    }

    return this.toResponseDto(removed);
  }

  private async assertTypologyBelongsToTenant(
    typologyId: string,
    tenantId: string,
  ): Promise<void> {
    const typology = await this.typologyRepository.findById(typologyId, tenantId);

    if (!typology) {
      throw new NotFoundException(
        `Development typology with id "${typologyId}" not found for this tenant`,
      );
    }
  }

  private async assertFeatureAssignable(featureId: string): Promise<void> {
    const feature = await this.propertyFeatureRepository.findById(featureId);

    if (!feature) {
      throw new BadRequestException(
        `Property feature with id "${featureId}" not found`,
      );
    }

    if (!feature.isActive) {
      throw new BadRequestException(
        `Property feature "${feature.slug}" is not active and cannot be assigned`,
      );
    }

    if (!isTypologyFeatureCategory(feature.category)) {
      throw new BadRequestException(
        `Feature category "${feature.category}" cannot be assigned to a typology`,
      );
    }

    if (!isAllowedTypologyFeatureSlug(feature.slug)) {
      throw new BadRequestException(
        `Feature "${feature.slug}" cannot be assigned to a typology`,
      );
    }
  }

  private async assertFeaturesAssignable(
    items: AssignDevelopmentTypologyFeatureDto[],
  ): Promise<void> {
    for (const item of items) {
      await this.assertFeatureAssignable(item.featureId);
    }
  }

  private toResponseDto(
    assignment: DevelopmentTypologyFeatureAssignmentWithFeature,
  ): DevelopmentTypologyFeatureAssignmentResponseDto {
    return {
      featureId: assignment.featureId,
      name: assignment.feature.name,
      slug: assignment.feature.slug,
      category: assignment.feature.category,
      value: assignment.value,
    };
  }
}
