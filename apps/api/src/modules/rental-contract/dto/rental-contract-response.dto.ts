import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalContractStatus } from '../../../../generated/prisma/client';
import type { RentalContractRecord } from '../repositories/rental-contract.repository';

export class RentalContractContactSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;
}

export class RentalContractPropertySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}

export class RentalContractResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiPropertyOptional({ nullable: true })
  propertyId: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: RentalContractPropertySummaryDto,
  })
  property: RentalContractPropertySummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  renterContactId: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: RentalContractContactSummaryDto,
  })
  renterContact: RentalContractContactSummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  landlordContactId: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: RentalContractContactSummaryDto,
  })
  landlordContact: RentalContractContactSummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  createdById: string | null;

  @ApiProperty()
  propertyAddressSnapshot: string;

  @ApiPropertyOptional({ nullable: true })
  propertyLocalitySnapshot: string | null;

  @ApiPropertyOptional({ nullable: true })
  propertyUnitSnapshot: string | null;

  @ApiPropertyOptional({ nullable: true })
  propertyNotesSnapshot: string | null;

  @ApiProperty({ format: 'date' })
  startsOn: Date;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  endsOn: Date | null;

  @ApiProperty({ enum: RentalContractStatus })
  status: RentalContractStatus;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(contract: RentalContractRecord): RentalContractResponseDto {
    return contract;
  }
}
