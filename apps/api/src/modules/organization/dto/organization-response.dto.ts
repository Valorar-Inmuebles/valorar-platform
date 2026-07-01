import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Tenant, TenantSetting } from '../../../../generated/prisma/client';

export class OrganizationResponseDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  tenantName!: string;

  @ApiProperty()
  tenantSlug!: string;

  @ApiPropertyOptional()
  companyName?: string | null;

  @ApiPropertyOptional()
  legalName?: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  primaryColor?: string | null;

  @ApiPropertyOptional()
  secondaryColor?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  whatsapp?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  website?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  facebookUrl?: string | null;

  @ApiPropertyOptional()
  instagramUrl?: string | null;

  @ApiPropertyOptional()
  linkedinUrl?: string | null;

  @ApiPropertyOptional()
  shortDescription?: string | null;

  @ApiPropertyOptional()
  seoTitle?: string | null;

  @ApiPropertyOptional()
  seoDescription?: string | null;

  @ApiPropertyOptional({ description: 'Reserved for custom domain (future)' })
  domain?: string | null;

  static fromEntities(
    tenant: Pick<Tenant, 'id' | 'name' | 'slug'>,
    settings: TenantSetting | null,
  ): OrganizationResponseDto {
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      companyName: settings?.companyName ?? null,
      legalName: settings?.legalName ?? null,
      logoUrl: settings?.logoUrl ?? null,
      primaryColor: settings?.primaryColor ?? null,
      secondaryColor: settings?.secondaryColor ?? null,
      phone: settings?.phone ?? null,
      whatsapp: settings?.whatsapp ?? null,
      email: settings?.email ?? null,
      website: settings?.website ?? null,
      address: settings?.address ?? null,
      facebookUrl: settings?.facebookUrl ?? null,
      instagramUrl: settings?.instagramUrl ?? null,
      linkedinUrl: settings?.linkedinUrl ?? null,
      shortDescription: settings?.shortDescription ?? null,
      seoTitle: settings?.seoTitle ?? null,
      seoDescription: settings?.seoDescription ?? null,
      domain: settings?.domain ?? null,
    };
  }
}
