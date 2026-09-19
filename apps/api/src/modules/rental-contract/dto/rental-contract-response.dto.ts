import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  RentalContractPartyRole,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import type { RentalContractRecord } from '../repositories/rental-contract.repository';

export class RentalContractNotificationRouteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationChannel }) channel: NotificationChannel;
  @ApiProperty() contactPointId: string;
  @ApiProperty() isEnabled: boolean;
}

export class RentalContractPartyResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() contactId: string;
  @ApiProperty({ enum: RentalContractPartyRole }) role: RentalContractPartyRole;
  @ApiProperty() contact: RentalContractRecord['parties'][number]['contact'];
  @ApiProperty({
    type: RentalContractNotificationRouteResponseDto,
    isArray: true,
  })
  notificationRoutes: RentalContractRecord['parties'][number]['notificationRoutes'];
}

export class RentalContractResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiPropertyOptional({ nullable: true }) propertyId: string | null;
  @ApiPropertyOptional({ nullable: true })
  property: RentalContractRecord['property'];
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() propertyAddressSnapshot: string;
  @ApiPropertyOptional({ nullable: true }) propertyCountryId: string | null;
  @ApiPropertyOptional({ nullable: true }) propertyProvinceId: string | null;
  @ApiPropertyOptional({ nullable: true }) propertyLocalityId: string | null;
  @ApiPropertyOptional({ nullable: true }) propertyNeighborhoodId:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyCountrySnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyProvinceSnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyLocalitySnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyNeighborhoodSnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyStreetSnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyStreetNumberSnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyFloorSnapshot: string | null;
  @ApiPropertyOptional({ nullable: true }) propertyUnitSnapshot: string | null;
  @ApiPropertyOptional({ nullable: true }) propertyPostalCodeSnapshot:
    | string
    | null;
  @ApiPropertyOptional({ nullable: true }) propertyNotesSnapshot: string | null;
  @ApiProperty({ format: 'date' }) startsOn: Date;
  @ApiPropertyOptional({ format: 'date', nullable: true }) endsOn: Date | null;
  @ApiProperty({ enum: RentalContractStatus }) status: RentalContractStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty({ type: RentalContractPartyResponseDto, isArray: true })
  parties: RentalContractRecord['parties'];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(contract: RentalContractRecord): RentalContractResponseDto {
    return contract;
  }
}
