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
  ListPublicDevelopmentsQueryDto,
  PublicDevelopmentSlugQueryDto,
} from '../dto/public-development-query.dto';
import {
  PublicDevelopmentCardDto,
  PublicDevelopmentDetailDto,
  PublicDevelopmentListResponseDto,
} from '../dto/public-development-response.dto';
import { PublicDevelopmentService } from '../services/public-development.service';

@ApiTags('Public Developments')
@Controller('public/developments')
export class PublicDevelopmentController {
  constructor(
    private readonly publicDevelopmentService: PublicDevelopmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List publishable developments' })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'provinceId', required: false, type: String })
  @ApiQuery({ name: 'localityId', required: false, type: String })
  @ApiQuery({ name: 'neighborhoodId', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'neighborhood', required: false, type: String })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'currency', required: false, enum: ['ARS', 'USD'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PIT', 'UNDER_CONSTRUCTION', 'COMPLETED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({
    description: 'Paginated list of publishable developments',
    type: PublicDevelopmentListResponseDto,
  })
  findAll(@Query() query: ListPublicDevelopmentsQueryDto) {
    return this.publicDevelopmentService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a publishable development by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiOkResponse({
    description: 'Public development detail',
    type: PublicDevelopmentDetailDto,
  })
  @ApiNotFoundResponse({ description: 'Public development not found' })
  findBySlug(
    @Param('slug') slug: string,
    @Query() query: PublicDevelopmentSlugQueryDto,
  ) {
    return this.publicDevelopmentService.findBySlug(slug, query.tenantId);
  }
}
