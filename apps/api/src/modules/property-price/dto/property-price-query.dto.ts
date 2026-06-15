import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PropertyPriceTenantQueryDto {
  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ListPropertyPricesQueryDto extends PropertyPriceTenantQueryDto {
  @ApiProperty({ description: 'Filter by property listing' })
  @IsString()
  @IsNotEmpty()
  listingId: string;
}
