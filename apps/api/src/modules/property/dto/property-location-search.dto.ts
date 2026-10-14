import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class PropertyLocationSearchDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(2, 120)
  street: string;

  @ApiPropertyOptional({ maxLength: 24 })
  @IsOptional()
  @IsString()
  @Length(1, 24)
  streetNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  neighborhoodId?: string;

  @ApiPropertyOptional({ description: 'Legacy address without catalog IDs' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  province?: string;

  @ApiPropertyOptional({ description: 'Legacy address without catalog IDs' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 16)
  postalCode?: string;

  @ApiProperty({ enum: ['AR'] })
  @IsString()
  @Matches(/^AR$/)
  country: 'AR';
}

export type LocationCandidate = {
  label: string;
  latitude: number;
  longitude: number;
  granularity: 'ADDRESS' | 'STREET' | 'NEIGHBORHOOD' | 'LOCALITY';
  warnings: string[];
  bounds?: { south: number; west: number; north: number; east: number };
};

export type LocationSearchResult = {
  status: 'RESULTS' | 'NO_RESULTS';
  candidates: LocationCandidate[];
};
