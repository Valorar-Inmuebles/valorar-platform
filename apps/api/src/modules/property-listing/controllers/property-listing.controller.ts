import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { CreatePropertyListingDto } from '../dto/create-property-listing.dto';
import {
  ListPropertyListingsQueryDto,
  PropertyListingTenantQueryDto,
} from '../dto/property-listing-query.dto';
import { PropertyListingResponseDto } from '../dto/property-listing-response.dto';
import { UpdatePropertyListingDto } from '../dto/update-property-listing.dto';
import { PropertyListingService } from '../services/property-listing.service';

@ApiTags('Property Listings')
@Controller('property-listings')
export class PropertyListingController {
  constructor(
    private readonly propertyListingService: PropertyListingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a property listing' })
  @ApiBody({ type: CreatePropertyListingDto })
  @ApiCreatedResponse({
    description: 'Property listing created successfully',
    type: PropertyListingResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error, tenant not found, or property not found',
  })
  @ApiConflictResponse({
    description:
      'A listing with the same type already exists for this property',
  })
  create(@Body() dto: CreatePropertyListingDto) {
    return this.propertyListingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List property listings by tenant' })
  @ApiOkResponse({
    description: 'List of property listings',
    type: PropertyListingResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: ListPropertyListingsQueryDto) {
    return this.propertyListingService.findAll(query.tenantId, {
      propertyId: query.propertyId,
      listingType: query.listingType,
      status: query.status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property listing by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property listing details',
    type: PropertyListingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  findOne(
    @Param('id') id: string,
    @Query() query: PropertyListingTenantQueryDto,
  ) {
    return this.propertyListingService.findOne(id, query.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property listing' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyListingDto })
  @ApiOkResponse({
    description: 'Property listing updated successfully',
    type: PropertyListingResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, invalid status transition, or invalid query',
  })
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  update(
    @Param('id') id: string,
    @Query() query: PropertyListingTenantQueryDto,
    @Body() dto: UpdatePropertyListingDto,
  ) {
    return this.propertyListingService.update(id, query.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Close a property listing (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property listing closed successfully',
    type: PropertyListingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  remove(
    @Param('id') id: string,
    @Query() query: PropertyListingTenantQueryDto,
  ) {
    return this.propertyListingService.remove(id, query.tenantId);
  }
}
