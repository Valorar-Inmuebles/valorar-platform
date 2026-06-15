import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PropertyImageTenantQueryDto {
  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ListPropertyImagesQueryDto extends PropertyImageTenantQueryDto {
  @ApiProperty({ description: 'Filter by property' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;
}
