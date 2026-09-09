import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRentalConceptDto } from '../dto/create-rental-concept.dto';
import { RentalConceptResponseDto } from '../dto/rental-concept-response.dto';
import { RentalConceptRepository } from '../repositories/rental-concept.repository';

@Injectable()
export class RentalConceptService {
  constructor(private readonly repository: RentalConceptRepository) {}

  async findAll(tenantId: string, includeInactive = false) {
    const concepts = await this.repository.findMany(tenantId, includeInactive);
    return concepts.map((concept) =>
      RentalConceptResponseDto.fromEntity(concept),
    );
  }

  async create(tenantId: string, dto: CreateRentalConceptDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Rental concept name is required');
    const slug = dto.slug.trim().toLowerCase();
    if (await this.repository.findBySlug(slug, tenantId)) {
      throw new ConflictException(
        `Rental concept with slug "${slug}" already exists for this tenant`,
      );
    }

    const concept = await this.repository.create({
      tenantId,
      name,
      slug,
      systemCode: null,
      isActive: true,
      sortOrder: 1000,
    });

    return RentalConceptResponseDto.fromEntity(concept);
  }

  async setActive(id: string, tenantId: string, isActive: boolean) {
    const existing = await this.repository.findById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Rental concept with id "${id}" not found`);
    }

    const updated = await this.repository.updateActive(id, tenantId, isActive);
    if (!updated) {
      throw new NotFoundException(`Rental concept with id "${id}" not found`);
    }

    return RentalConceptResponseDto.fromEntity(updated);
  }
}
