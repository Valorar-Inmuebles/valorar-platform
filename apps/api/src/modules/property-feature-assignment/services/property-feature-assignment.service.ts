import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyFeatureRepository } from '../../property-feature/repositories/property-feature.repository';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { AssignPropertyFeatureDto } from '../dto/assign-property-feature.dto';
import { PropertyFeatureAssignmentResponseDto } from '../dto/property-feature-assignment-response.dto';
import { ReplacePropertyFeatureAssignmentsDto } from '../dto/replace-property-feature-assignments.dto';
import {
  PropertyFeatureAssignmentRepository,
  PropertyFeatureAssignmentWithFeature,
} from '../repositories/property-feature-assignment.repository';

@Injectable()
export class PropertyFeatureAssignmentService {
  constructor(
    private readonly assignmentRepository: PropertyFeatureAssignmentRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly propertyFeatureRepository: PropertyFeatureRepository,
  ) {}

  async findAll(
    propertyId: string,
    tenantId: string,
  ): Promise<PropertyFeatureAssignmentResponseDto[]> {
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const assignments = await this.assignmentRepository.findManyByProperty(
      propertyId,
      tenantId,
    );

    return assignments.map(this.toResponseDto);
  }

  async replaceAll(
    propertyId: string,
    tenantId: string,
    dto: ReplacePropertyFeatureAssignmentsDto,
  ): Promise<PropertyFeatureAssignmentResponseDto[]> {
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);
    await this.assertFeaturesAssignable(dto.features);

    const assignments = await this.assignmentRepository.replaceAll(
      propertyId,
      tenantId,
      dto.features.map((item) => ({
        featureId: item.featureId,
        value: item.value ?? null,
      })),
    );

    return assignments.map(this.toResponseDto);
  }

  async assign(
    propertyId: string,
    tenantId: string,
    dto: AssignPropertyFeatureDto,
  ): Promise<PropertyFeatureAssignmentResponseDto> {
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);
    await this.assertFeatureAssignable(dto.featureId);

    const existing = await this.assignmentRepository.findByPropertyAndFeature(
      propertyId,
      dto.featureId,
      tenantId,
    );

    if (existing) {
      throw new ConflictException(
        `Feature "${dto.featureId}" is already assigned to this property`,
      );
    }

    const assignment = await this.assignmentRepository.create(
      propertyId,
      tenantId,
      dto.featureId,
      dto.value ?? null,
    );

    return this.toResponseDto(assignment);
  }

  async unassign(
    propertyId: string,
    featureId: string,
    tenantId: string,
  ): Promise<PropertyFeatureAssignmentResponseDto> {
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const removed = await this.assignmentRepository.deleteByPropertyAndFeature(
      propertyId,
      featureId,
      tenantId,
    );

    if (!removed) {
      throw new NotFoundException(
        `Feature assignment for feature "${featureId}" not found on this property`,
      );
    }

    return this.toResponseDto(removed);
  }

  private async assertPropertyBelongsToTenant(
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const property = await this.propertyRepository.findById(
      propertyId,
      tenantId,
    );

    if (!property) {
      throw new NotFoundException(
        `Property with id "${propertyId}" not found for this tenant`,
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
  }

  private async assertFeaturesAssignable(
    items: AssignPropertyFeatureDto[],
  ): Promise<void> {
    for (const item of items) {
      await this.assertFeatureAssignable(item.featureId);
    }
  }

  private toResponseDto(
    assignment: PropertyFeatureAssignmentWithFeature,
  ): PropertyFeatureAssignmentResponseDto {
    return {
      featureId: assignment.featureId,
      name: assignment.feature.name,
      slug: assignment.feature.slug,
      category: assignment.feature.category,
      value: assignment.value,
    };
  }
}
