import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  NotificationChannel,
  RentalContractPartyRole,
} from '../../../../generated/prisma/client';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class RentalContractNotificationRouteInputDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactPointId: string;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class RentalContractPartyInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactId: string;
  @ApiProperty({ enum: RentalContractPartyRole })
  @IsEnum(RentalContractPartyRole)
  role: RentalContractPartyRole;
  @ApiPropertyOptional({
    type: RentalContractNotificationRouteInputDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalContractNotificationRouteInputDto)
  notificationRoutes?: RentalContractNotificationRouteInputDto[];
}

export class CreateRentalContractDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyCountryId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyProvinceId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyLocalityId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  propertyNeighborhoodId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  propertyCountrySnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  propertyProvinceSnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  propertyLocalitySnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  propertyNeighborhoodSnapshot?: string | null;
  @ApiProperty({ example: 'Av. Rivadavia' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 180)
  propertyStreetSnapshot: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  propertyStreetNumberSnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  propertyFloorSnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 80)
  propertyUnitSnapshot?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 24)
  propertyPostalCodeSnapshot?: string | null;
  @ApiPropertyOptional({
    description: 'Derived display summary',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(0, 240)
  propertyAddressSnapshot?: string;
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
  @ApiPropertyOptional({ type: RentalContractPartyInputDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalContractPartyInputDto)
  parties?: RentalContractPartyInputDto[];
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  notes?: string | null;
}
