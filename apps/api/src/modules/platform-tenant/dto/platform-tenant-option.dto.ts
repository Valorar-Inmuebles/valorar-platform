import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantStatus,
  type Tenant,
  type TenantSetting,
} from '../../../../generated/prisma/client';

export class PlatformTenantOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: TenantStatus })
  status!: TenantStatus;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  static fromEntity(
    tenant: Pick<Tenant, 'id' | 'name' | 'slug' | 'status'>,
    settings: Pick<TenantSetting, 'logoUrl'> | null,
  ): PlatformTenantOptionDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      logoUrl: settings?.logoUrl ?? null,
    };
  }
}
