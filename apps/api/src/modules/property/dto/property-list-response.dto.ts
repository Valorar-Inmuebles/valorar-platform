import { ApiProperty } from '@nestjs/swagger';
import type {
  PropertyListItem,
  PropertyListResponse,
} from '@repo/shared-types';
import {
  Currency,
  PropertyListingType,
  PropertyType,
} from '../../../../generated/prisma/client';

class PropertyListLocationDto {
  @ApiProperty() localityName!: string;
  @ApiProperty({ type: String, nullable: true }) neighborhoodName!:
    | string
    | null;
}
class PropertyListPrimaryPriceDto {
  @ApiProperty() amount!: number;
  @ApiProperty({ enum: Currency }) currency!: Currency;
}
class PropertyListPublishedOperationDto {
  @ApiProperty({ enum: PropertyListingType }) listingType!: PropertyListingType;
  @ApiProperty({ type: PropertyListPrimaryPriceDto, nullable: true })
  primaryPrice!: PropertyListPrimaryPriceDto | null;
}
class PropertyListCreatorDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() isActive!: boolean;
}
class PropertyListCapabilitiesDto {
  @ApiProperty() canEdit!: boolean;
  @ApiProperty() canArchive!: boolean;
  @ApiProperty() canRestore!: boolean;
}
class PropertyCommercialCountsDto {
  @ApiProperty() all!: number;
  @ApiProperty() active!: number;
  @ApiProperty() published!: number;
  @ApiProperty() commercialDraft!: number;
  @ApiProperty() archived!: number;
}
class PropertyListItemDto implements PropertyListItem {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) internalCode!: string | null;
  @ApiProperty({ enum: PropertyType }) propertyType!: PropertyType;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: PropertyListLocationDto })
  location!: PropertyListLocationDto;
  @ApiProperty({ enum: PropertyListingType, isArray: true })
  listingTypes!: PropertyListingType[];
  @ApiProperty({ type: [PropertyListPublishedOperationDto] })
  publishedOperations!: PropertyListPublishedOperationDto[];
  @ApiProperty({ enum: ['published', 'commercial-draft', 'archived'] })
  statusVariant!: PropertyListItem['statusVariant'];
  @ApiProperty() isAnyPublishable!: boolean;
  @ApiProperty({ type: String, nullable: true }) publicUrl!: string | null;
  @ApiProperty() activeListingsCount!: number;
  @ApiProperty({ type: PropertyListCreatorDto, nullable: true })
  createdBy!: PropertyListCreatorDto | null;
  @ApiProperty({ type: PropertyListCapabilitiesDto })
  capabilities!: PropertyListCapabilitiesDto;
}
export class PropertyListResponseDto implements PropertyListResponse {
  @ApiProperty({ type: [PropertyListItemDto] }) items!: PropertyListItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() page!: number;
  @ApiProperty({ enum: [20, 50, 100] }) pageSize!: number;
  @ApiProperty({ type: PropertyCommercialCountsDto })
  commercialCounts!: PropertyCommercialCountsDto;
}
