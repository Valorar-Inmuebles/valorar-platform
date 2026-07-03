import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isDevelopmentFeatureCategory } from '../../development/constants/development-feature-categories';
import { DevelopmentRepository } from '../../development/repositories/development.repository';
import { PropertyFeatureRepository } from '../../property-feature/repositories/property-feature.repository';
import { AssignDevelopmentFeatureDto } from '../dto/assign-development-feature.dto';
import { DevelopmentFeatureAssignmentResponseDto } from '../dto/development-feature-assignment-response.dto';
import { ReplaceDevelopmentFeatureAssignmentsDto } from '../dto/replace-development-feature-assignments.dto';
import {
  DevelopmentFeatureAssignmentRepository,
  DevelopmentFeatureAssignmentWithFeature,
} from '../repositories/development-feature-assignment.repository';

@Injectable()
export class DevelopmentFeatureAssignmentService {
  constructor(
    private readonly assignmentRepository: DevelopmentFeatureAssignmentRepository,
    private readonly developmentRepository: DevelopmentRepository,
    private readonly propertyFeatureRepository: PropertyFeatureRepository,
  ) {}

  async findAll(
    developmentId: string,
    tenantId: string,
  ): Promise<DevelopmentFeatureAssignmentResponseDto[]> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);

    const assignments =
      await this.assignmentRepository.findManyByDevelopment(
        developmentId,
        tenantId,
      );

    return assignments.map(this.toResponseDto);
  }

  async replaceAll(
    developmentId: string,
    tenantId: string,
    dto: ReplaceDevelopmentFeatureAssignmentsDto,
  ): Promise<DevelopmentFeatureAssignmentResponseDto[]> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);
    await this.assertFeaturesAssignable(dto.features);

    const assignments = await this.assignmentRepository.replaceAll(
      developmentId,
      tenantId,
      dto.features.map((item) => ({
        featureId: item.featureId,
        value: item.value ?? null,
      })),
    );

    return assignments.map(this.toResponseDto);
  }

  async assign(
    developmentId: string,
    tenantId: string,
    dto: AssignDevelopmentFeatureDto,
  ): Promise<DevelopmentFeatureAssignmentResponseDto> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);
    await this.assertFeatureAssignable(dto.featureId);

    const existing =
      await this.assignmentRepository.findByDevelopmentAndFeature(
        developmentId,
        dto.featureId,
        tenantId,
      );

    if (existing) {
      throw new ConflictException(
        `Feature "${dto.featureId}" is already assigned to this development`,
      );
    }

    const assignment = await this.assignmentRepository.create(
      developmentId,
      tenantId,
      dto.featureId,
      dto.value ?? null,
    );

    return this.toResponseDto(assignment);
  }

  async unassign(
    developmentId: string,
    featureId: string,
    tenantId: string,
  ): Promise<DevelopmentFeatureAssignmentResponseDto> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);

    const removed =
      await this.assignmentRepository.deleteByDevelopmentAndFeature(
        developmentId,
        featureId,
        tenantId,
      );

    if (!removed) {
      throw new NotFoundException(
        `Feature assignment for feature "${featureId}" not found on this development`,
      );
    }

    return this.toResponseDto(removed);
  }

  private async assertDevelopmentBelongsToTenant(
    developmentId: string,
    tenantId: string,
  ): Promise<void> {
    const development = await this.developmentRepository.findById(
      developmentId,
      tenantId,
    );

    if (!development) {
      throw new NotFoundException(
        `Development with id "${developmentId}" not found for this tenant`,
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

    if (!isDevelopmentFeatureCategory(feature.category)) {
      throw new BadRequestException(
        `Feature category "${feature.category}" cannot be assigned to a development`,
      );
    }
  }

  private async assertFeaturesAssignable(
    items: AssignDevelopmentFeatureDto[],
  ): Promise<void> {
    for (const item of items) {
      await this.assertFeatureAssignable(item.featureId);
    }
  }

  private toResponseDto(
    assignment: DevelopmentFeatureAssignmentWithFeature,
  ): DevelopmentFeatureAssignmentResponseDto {
    return {
      featureId: assignment.featureId,
      name: assignment.feature.name,
      slug: assignment.feature.slug,
      category: assignment.feature.category,
      value: assignment.value,
    };
  }
}
