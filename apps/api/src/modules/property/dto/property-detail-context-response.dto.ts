import { ApiProperty } from '@nestjs/swagger';
import { PropertyListingResponseDto } from '../../property-listing/dto/property-listing-response.dto';
import { PropertyPriceResponseDto } from '../../property-price/dto/property-price-response.dto';
import { PropertyResponseDto } from './property-response.dto';
import { PropertyPublishabilityResponseDto } from './property-publishability-response.dto';

export class PropertyDetailListingDto {
  @ApiProperty({ type: PropertyListingResponseDto })
  listing!: PropertyListingResponseDto;

  @ApiProperty({ type: [PropertyPriceResponseDto] })
  prices!: PropertyPriceResponseDto[];

  @ApiProperty({ type: PropertyPublishabilityResponseDto })
  publishability!: PropertyPublishabilityResponseDto;
}

export class PropertyDetailContextResponseDto {
  @ApiProperty({ type: PropertyResponseDto })
  property!: PropertyResponseDto;

  @ApiProperty({ type: [PropertyDetailListingDto] })
  operations!: PropertyDetailListingDto[];

  @ApiProperty()
  imageCount!: number;

  @ApiProperty()
  hasCoverImage!: boolean;

  @ApiProperty()
  featureCount!: number;
}
