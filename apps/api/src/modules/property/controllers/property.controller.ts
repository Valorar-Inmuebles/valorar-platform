import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePropertyDto } from '../dto/create-property.dto';
import {
  ListPropertiesQueryDto,
  PropertyTenantQueryDto,
} from '../dto/property-query.dto';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertyService } from '../services/property.service';

@ApiTags('Properties')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property' })
  @ApiBody({ type: CreatePropertyDto })
  @ApiCreatedResponse({
    description: 'Property created successfully',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error, tenant not found, or invalid createdById',
  })
  @ApiConflictResponse({
    description: 'Slug or internalCode already exists for tenant',
  })
  create(@Body() dto: CreatePropertyDto) {
    return this.propertyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List properties by tenant' })
  @ApiOkResponse({
    description: 'List of properties',
    type: PropertyResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: ListPropertiesQueryDto) {
    return this.propertyService.findAll(query.tenantId, query.isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Property details', type: PropertyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  findOne(@Param('id') id: string, @Query() query: PropertyTenantQueryDto) {
    return this.propertyService.findOne(id, query.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyDto })
  @ApiOkResponse({
    description: 'Property updated successfully',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error or invalid query' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({
    description: 'Slug or internalCode already exists for tenant',
  })
  update(
    @Param('id') id: string,
    @Query() query: PropertyTenantQueryDto,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(id, query.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a property (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property archived successfully',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  remove(@Param('id') id: string, @Query() query: PropertyTenantQueryDto) {
    return this.propertyService.remove(id, query.tenantId);
  }
}
