import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevelopmentRepository } from '../../development/repositories/development.repository';
import { CreateDevelopmentTypologyDto } from '../dto/create-development-typology.dto';
import { DevelopmentTypologyResponseDto } from '../dto/development-typology-response.dto';
import { UpdateDevelopmentTypologyDto } from '../dto/update-development-typology.dto';
import { DevelopmentTypologyRepository } from '../repositories/development-typology.repository';

@Injectable()
export class DevelopmentTypologyService {
  constructor(
    private readonly typologyRepository: DevelopmentTypologyRepository,
    private readonly developmentRepository: DevelopmentRepository,
  ) {}

  async create(
    dto: CreateDevelopmentTypologyDto,
    tenantId: string,
  ): Promise<DevelopmentTypologyResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertDevelopmentBelongsToTenant(dto.developmentId, tenantId);
    this.assertTypologyConstraints(dto);

    const typology = await this.typologyRepository.create({
      tenantId,
      developmentId: dto.developmentId,
      name: dto.name,
      description: dto.description,
      totalCount: dto.totalCount ?? null,
      availableCount: dto.availableCount ?? null,
      surfaceFrom: dto.surfaceFrom ?? null,
      surfaceTo: dto.surfaceTo ?? null,
      priceFrom: dto.priceFrom ?? null,
      currency: dto.currency ?? null,
      sortOrder: dto.sortOrder ?? 0,
    });

    return DevelopmentTypologyResponseDto.fromEntity(typology);
  }

  async findAll(
    tenantId: string,
    developmentId: string,
  ): Promise<DevelopmentTypologyResponseDto[]> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);

    const typologies = await this.typologyRepository.findMany(tenantId, {
      developmentId,
    });

    return typologies.map(DevelopmentTypologyResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyResponseDto> {
    const typology = await this.typologyRepository.findById(id, tenantId);

    if (!typology) {
      throw new NotFoundException(
        `Development typology with id "${id}" not found`,
      );
    }

    return DevelopmentTypologyResponseDto.fromEntity(typology);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateDevelopmentTypologyDto,
  ): Promise<DevelopmentTypologyResponseDto> {
    const existing = await this.typologyRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(
        `Development typology with id "${id}" not found`,
      );
    }

    const updateData = this.toUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return DevelopmentTypologyResponseDto.fromEntity(existing);
    }

    this.assertTypologyConstraints({
      totalCount:
        (updateData.totalCount as number | null | undefined) ??
        existing.totalCount,
      availableCount:
        (updateData.availableCount as number | null | undefined) ??
        existing.availableCount,
      surfaceFrom:
        updateData.surfaceFrom !== undefined
          ? updateData.surfaceFrom != null
            ? Number(updateData.surfaceFrom)
            : null
          : existing.surfaceFrom != null
            ? Number(existing.surfaceFrom)
            : null,
      surfaceTo:
        updateData.surfaceTo !== undefined
          ? updateData.surfaceTo != null
            ? Number(updateData.surfaceTo)
            : null
          : existing.surfaceTo != null
            ? Number(existing.surfaceTo)
            : null,
      priceFrom:
        updateData.priceFrom !== undefined
          ? updateData.priceFrom != null
            ? Number(updateData.priceFrom)
            : null
          : existing.priceFrom != null
            ? Number(existing.priceFrom)
            : null,
    });

    const typology = await this.typologyRepository.update(
      id,
      tenantId,
      updateData,
    );

    if (!typology) {
      throw new NotFoundException(
        `Development typology with id "${id}" not found`,
      );
    }

    return DevelopmentTypologyResponseDto.fromEntity(typology);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentTypologyResponseDto> {
    const existing = await this.typologyRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(
        `Development typology with id "${id}" not found`,
      );
    }

    const deleted = await this.typologyRepository.delete(id, tenantId);

    if (!deleted) {
      throw new NotFoundException(
        `Development typology with id "${id}" not found`,
      );
    }

    return DevelopmentTypologyResponseDto.fromEntity(existing);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.typologyRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
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
      throw new BadRequestException(
        `Development with id "${developmentId}" not found for this tenant`,
      );
    }
  }

  private assertTypologyConstraints(values: {
    totalCount?: number | null;
    availableCount?: number | null;
    surfaceFrom?: number | null;
    surfaceTo?: number | null;
    priceFrom?: number | null;
  }): void {
    if (
      values.availableCount != null &&
      values.totalCount != null &&
      values.availableCount > values.totalCount
    ) {
      throw new BadRequestException(
        'availableCount must be less than or equal to totalCount',
      );
    }

    if (
      values.surfaceTo != null &&
      values.surfaceFrom != null &&
      values.surfaceTo < values.surfaceFrom
    ) {
      throw new BadRequestException(
        'surfaceTo must be greater than or equal to surfaceFrom',
      );
    }

    if (values.priceFrom != null && values.priceFrom <= 0) {
      throw new BadRequestException('priceFrom must be greater than 0');
    }
  }

  private toUpdateData(dto: UpdateDevelopmentTypologyDto) {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.totalCount !== undefined) {
      data.totalCount = dto.totalCount;
    }

    if (dto.availableCount !== undefined) {
      data.availableCount = dto.availableCount;
    }

    if (dto.surfaceFrom !== undefined) {
      data.surfaceFrom = dto.surfaceFrom;
    }

    if (dto.surfaceTo !== undefined) {
      data.surfaceTo = dto.surfaceTo;
    }

    if (dto.priceFrom !== undefined) {
      data.priceFrom = dto.priceFrom;
    }

    if (dto.currency !== undefined) {
      data.currency = dto.currency;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    return data;
  }
}
