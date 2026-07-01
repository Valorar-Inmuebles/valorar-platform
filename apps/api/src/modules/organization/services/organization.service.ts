import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationRepository } from '../repositories/organization.repository';

@Injectable()
export class OrganizationService {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async getOrganization(tenantId: string): Promise<OrganizationResponseDto> {
    await this.assertTenantExists(tenantId);

    const tenant = await this.organizationRepository.findTenantSummary(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const settings = await this.organizationRepository.findByTenantId(tenantId);
    return OrganizationResponseDto.fromEntities(tenant, settings);
  }

  async updateOrganization(
    tenantId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    await this.assertTenantExists(tenantId);

    const tenant = await this.organizationRepository.findTenantSummary(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const normalized = this.normalizeDto(dto);
    const settings = await this.organizationRepository.upsert(tenantId, normalized);
    return OrganizationResponseDto.fromEntities(tenant, settings);
  }

  private normalizeDto(dto: UpdateOrganizationDto): UpdateOrganizationDto {
    const entries = Object.entries(dto).map(([key, value]) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return [key, trimmed === '' ? null : trimmed];
      }
      return [key, value];
    });

    return Object.fromEntries(entries) as UpdateOrganizationDto;
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.organizationRepository.tenantExists(tenantId);
    if (!exists) {
      throw new NotFoundException('Tenant not found');
    }
  }
}
