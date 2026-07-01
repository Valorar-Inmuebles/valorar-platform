import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantStatus } from '../../../../generated/prisma/client';
import { CreatePlatformTenantDto } from '../dto/create-platform-tenant.dto';
import { PlatformTenantListResponseDto } from '../dto/platform-tenant-list-response.dto';
import { PlatformTenantOptionDto } from '../dto/platform-tenant-option.dto';
import { PlatformTenantResponseDto } from '../dto/platform-tenant-response.dto';
import { PlatformTenantStatsDto } from '../dto/platform-tenant-stats.dto';
import { UpdatePlatformTenantDto } from '../dto/update-platform-tenant.dto';
import { PlatformTenantRepository } from '../repositories/platform-tenant.repository';
import {
  resolveUniqueTenantSlug,
  slugifyTenantName,
} from '../utils/tenant-slug.util';

@Injectable()
export class PlatformTenantService {
  constructor(
    private readonly platformTenantRepository: PlatformTenantRepository,
  ) {}

  async listTenants(): Promise<PlatformTenantListResponseDto> {
    const [stats, rows] = await Promise.all([
      this.getStats(),
      this.platformTenantRepository.findMany(),
    ]);

    return {
      stats,
      items: rows.map((row) =>
        PlatformTenantResponseDto.fromEntity(row, row.settings, {
          userCount: row._count.users,
          propertyCount: row._count.properties,
        }),
      ),
    };
  }

  async getStats(): Promise<PlatformTenantStatsDto> {
    return this.platformTenantRepository.getPlatformStats();
  }

  async getTenant(id: string): Promise<PlatformTenantResponseDto> {
    const row = await this.platformTenantRepository.findById(id);

    if (!row) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }

    return PlatformTenantResponseDto.fromEntity(row, row.settings, {
      userCount: row._count.users,
      propertyCount: row._count.properties,
    });
  }

  async listActiveOptions(): Promise<PlatformTenantOptionDto[]> {
    const rows = await this.platformTenantRepository.findActiveOptions();

    return rows.map((row) =>
      PlatformTenantOptionDto.fromEntity(row, row.settings),
    );
  }

  async createTenant(
    dto: CreatePlatformTenantDto,
  ): Promise<PlatformTenantResponseDto> {
    const name = dto.name.trim();
    const slug = await this.resolveSlug(dto.slug?.trim() || name);
    const settings = this.normalizeSettings(dto);

    const created = await this.platformTenantRepository.createTenant(
      { name, slug },
      settings,
    );

    return PlatformTenantResponseDto.fromEntity(created, created.settings, {
      userCount: created._count.users,
      propertyCount: created._count.properties,
    });
  }

  async updateTenant(
    id: string,
    dto: UpdatePlatformTenantDto,
  ): Promise<PlatformTenantResponseDto> {
    const existing = await this.platformTenantRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }

    const tenantData: { name?: string; slug?: string } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('name cannot be empty');
      }
      tenantData.name = name;
    }

    if (dto.slug !== undefined) {
      const slug = slugifyTenantName(dto.slug.trim());
      if (!slug) {
        throw new BadRequestException('slug cannot be empty');
      }
      if (await this.platformTenantRepository.slugExists(slug, id)) {
        throw new ConflictException(`Slug "${slug}" is already in use`);
      }
      tenantData.slug = slug;
    }

    const settings = this.normalizeSettings(dto, true);
    const updated = await this.platformTenantRepository.updateTenant(
      id,
      tenantData,
      settings,
    );

    return PlatformTenantResponseDto.fromEntity(updated, updated.settings, {
      userCount: updated._count.users,
      propertyCount: updated._count.properties,
    });
  }

  async suspendTenant(id: string): Promise<PlatformTenantResponseDto> {
    return this.setTenantStatus(id, TenantStatus.SUSPENDED);
  }

  async reactivateTenant(id: string): Promise<PlatformTenantResponseDto> {
    return this.setTenantStatus(id, TenantStatus.ACTIVE);
  }

  private async setTenantStatus(
    id: string,
    status: TenantStatus,
  ): Promise<PlatformTenantResponseDto> {
    const existing = await this.platformTenantRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Tenant with id "${id}" not found`);
    }

    if (existing.status === status) {
      return PlatformTenantResponseDto.fromEntity(
        existing,
        existing.settings,
        {
          userCount: existing._count.users,
          propertyCount: existing._count.properties,
        },
      );
    }

    const updated = await this.platformTenantRepository.updateStatus(id, status);

    return PlatformTenantResponseDto.fromEntity(updated, updated.settings, {
      userCount: updated._count.users,
      propertyCount: updated._count.properties,
    });
  }

  private async resolveSlug(input: string): Promise<string> {
    const base = slugifyTenantName(input);
    if (!base) {
      throw new BadRequestException('Could not generate a valid slug');
    }

    return resolveUniqueTenantSlug(base, (slug) =>
      this.platformTenantRepository.slugExists(slug),
    );
  }

  private normalizeSettings(
    dto: CreatePlatformTenantDto | UpdatePlatformTenantDto,
    allowNull = false,
  ) {
    const settings: {
      logoUrl?: string | null;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      domain?: string | null;
    } = {};

    const fields = ['logoUrl', 'email', 'phone', 'whatsapp', 'domain'] as const;

    for (const field of fields) {
      if (dto[field] === undefined) {
        continue;
      }

      const value = dto[field];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        settings[field] = trimmed === '' && allowNull ? null : trimmed || null;
      } else if (allowNull) {
        settings[field] = value;
      }
    }

    return settings;
  }
}
