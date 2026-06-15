import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  FeaturedPublicPropertiesQueryDto,
  ListPublicPropertiesQueryDto,
  PublicPropertySlugQueryDto,
} from '../dto/public-property-query.dto';
import {
  PublicPropertyCardDto,
  PublicPropertyDetailDto,
  PublicPropertyListResponseDto,
} from '../dto/public-property-response.dto';
import { PublicPropertyService } from '../services/public-property.service';

@ApiTags('Public Properties')
@Controller('public/properties')
export class PublicPropertyController {
  constructor(private readonly publicPropertyService: PublicPropertyService) {}

  @Get()
  @ApiOperation({ summary: 'List publishable properties' })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'listingType', required: false, enum: ['SALE', 'RENT', 'TEMPORARY_RENT'] })
  @ApiQuery({ name: 'propertyType', required: false })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'neighborhood', required: false, type: String })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'currency', required: false, enum: ['ARS', 'USD'] })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number })
  @ApiQuery({ name: 'bathrooms', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({
    description: 'Paginated list of publishable properties',
    type: PublicPropertyListResponseDto,
  })
  findAll(@Query() query: ListPublicPropertiesQueryDto) {
    return this.publicPropertyService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'List featured publishable properties',
    description:
      'Returns properties with an ACTIVE featured listing, ordered by publishedAt descending',
  })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({
    description: 'Featured publishable properties',
    type: PublicPropertyCardDto,
    isArray: true,
  })
  findFeatured(@Query() query: FeaturedPublicPropertiesQueryDto) {
    return this.publicPropertyService.findFeatured(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a publishable property by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'listingType', required: false, enum: ['SALE', 'RENT', 'TEMPORARY_RENT'] })
  @ApiOkResponse({
    description: 'Public property detail',
    type: PublicPropertyDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Public property not found' })
  findBySlug(
    @Param('slug') slug: string,
    @Query() query: PublicPropertySlugQueryDto,
  ) {
    return this.publicPropertyService.findBySlug(
      slug,
      query.tenantId,
      query.listingType,
    );
  }
}
