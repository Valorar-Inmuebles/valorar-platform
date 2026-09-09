import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRentalContractDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  renterContactId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  landlordContactId?: string | null;

  @ApiProperty({ example: 'Av. Rivadavia 1234' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 240)
  propertyAddressSnapshot: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  propertyLocalitySnapshot?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  propertyUnitSnapshot?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  propertyNotesSnapshot?: string | null;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  startsOn: string;

  @ApiPropertyOptional({
    example: '2028-08-31',
    format: 'date',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  endsOn?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  notes?: string | null;
}
