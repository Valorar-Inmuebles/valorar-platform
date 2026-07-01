import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantStatus,
  type Tenant,
  type TenantSetting,
} from '../../../../generated/prisma/client';

export class PlatformTenantResponseDto {
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

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  whatsapp?: string | null;

  @ApiPropertyOptional()
  domain?: string | null;

  @ApiProperty()
  userCount!: number;

  @ApiProperty()
  propertyCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    tenant: Tenant,
    settings: TenantSetting | null,
    counts: { userCount: number; propertyCount: number },
  ): PlatformTenantResponseDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      logoUrl: settings?.logoUrl ?? null,
      email: settings?.email ?? null,
      phone: settings?.phone ?? null,
      whatsapp: settings?.whatsapp ?? null,
      domain: settings?.domain ?? null,
      userCount: counts.userCount,
      propertyCount: counts.propertyCount,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
