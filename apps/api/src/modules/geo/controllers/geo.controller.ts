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
  LocalitySearchResultDto,
  SearchLocalitiesQueryDto,
  SearchLocalitiesQueryDtoForProvince,
  SearchNeighborhoodsQueryDto,
} from '../dto/geo-search.dto';
import { LocalityResponseDto } from '../dto/locality-response.dto';
import { NeighborhoodResponseDto } from '../dto/neighborhood-response.dto';
import { ProvinceResponseDto } from '../dto/province-response.dto';
import { GeoService } from '../services/geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'List provinces (Argentina catalog)' })
  @ApiOkResponse({
    description: 'List of provinces',
    type: ProvinceResponseDto,
    isArray: true,
  })
  findProvinces() {
    return this.geoService.findProvinces();
  }

  @Get('localities/search')
  @ApiOperation({ summary: 'Search localities by name (autocomplete)' })
  @ApiOkResponse({
    description: 'Matching localities',
    type: LocalitySearchResultDto,
    isArray: true,
  })
  searchLocalities(@Query() query: SearchLocalitiesQueryDto) {
    return this.geoService.searchLocalities(
      query.q,
      query.provinceId,
      query.limit,
    );
  }

  @Get('provinces/:id/localities')
  @ApiOperation({ summary: 'List localities for a province' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'List of localities',
    type: LocalityResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Province not found' })
  findLocalitiesByProvince(
    @Param('id') id: string,
    @Query() query: SearchLocalitiesQueryDtoForProvince,
  ) {
    return this.geoService.findLocalitiesByProvinceId(id, query.q, query.limit);
  }

  @Get('localities/:id/neighborhoods')
  @ApiOperation({ summary: 'List neighborhoods for a locality' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'List of neighborhoods',
    type: NeighborhoodResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Locality not found' })
  findNeighborhoodsByLocality(
    @Param('id') id: string,
    @Query() query: SearchNeighborhoodsQueryDto,
  ) {
    return this.geoService.findNeighborhoodsByLocalityId(
      id,
      query.q,
      query.limit,
    );
  }
}
