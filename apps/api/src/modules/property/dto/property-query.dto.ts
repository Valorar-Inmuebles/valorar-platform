import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PropertyTenantQueryDto {
  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ListPropertiesQueryDto extends PropertyTenantQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
