import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyFeatureDto } from '../dto/create-property-feature.dto';
import { ListPropertyFeaturesQueryDto } from '../dto/property-feature-query.dto';
import { PropertyFeatureResponseDto } from '../dto/property-feature-response.dto';
import { UpdatePropertyFeatureDto } from '../dto/update-property-feature.dto';
import { PropertyFeatureRepository } from '../repositories/property-feature.repository';

@Injectable()
export class PropertyFeatureService {
  constructor(
    private readonly propertyFeatureRepository: PropertyFeatureRepository,
  ) {}

  async create(
    dto: CreatePropertyFeatureDto,
  ): Promise<PropertyFeatureResponseDto> {
    const feature = await this.propertyFeatureRepository.create({
      name: dto.name.trim(),
      slug: dto.slug.trim(),
      category: dto.category,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return PropertyFeatureResponseDto.fromEntity(feature);
  }

  async findAll(
    query: ListPropertyFeaturesQueryDto,
  ): Promise<PropertyFeatureResponseDto[]> {
    const features = await this.propertyFeatureRepository.findMany({
      category: query.category,
      isActive: query.isActive,
    });

    return features.map(PropertyFeatureResponseDto.fromEntity);
  }

  async findOne(id: string): Promise<PropertyFeatureResponseDto> {
    const feature = await this.propertyFeatureRepository.findById(id);

    if (!feature) {
      throw new NotFoundException(`Property feature with id "${id}" not found`);
    }

    return PropertyFeatureResponseDto.fromEntity(feature);
  }

  async update(
    id: string,
    dto: UpdatePropertyFeatureDto,
  ): Promise<PropertyFeatureResponseDto> {
    const existing = await this.propertyFeatureRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Property feature with id "${id}" not found`);
    }

    const updateData = this.toUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return PropertyFeatureResponseDto.fromEntity(existing);
    }

    const feature = await this.propertyFeatureRepository.update(id, updateData);

    if (!feature) {
      throw new NotFoundException(`Property feature with id "${id}" not found`);
    }

    return PropertyFeatureResponseDto.fromEntity(feature);
  }

  async remove(id: string): Promise<PropertyFeatureResponseDto> {
    const existing = await this.propertyFeatureRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Property feature with id "${id}" not found`);
    }

    const feature = await this.propertyFeatureRepository.deactivate(id);

    if (!feature) {
      throw new NotFoundException(`Property feature with id "${id}" not found`);
    }

    return PropertyFeatureResponseDto.fromEntity(feature);
  }

  private toUpdateData(dto: UpdatePropertyFeatureDto) {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.slug !== undefined) {
      data.slug = dto.slug.trim();
    }

    if (dto.category !== undefined) {
      data.category = dto.category;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    return data;
  }
}
