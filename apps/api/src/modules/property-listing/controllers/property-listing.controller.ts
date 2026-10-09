import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreatePropertyListingDto } from '../dto/create-property-listing.dto';
import { ListPropertyListingsQueryDto } from '../dto/property-listing-query.dto';
import { PropertyListingResponseDto } from '../dto/property-listing-response.dto';
import { UpdatePropertyListingDto } from '../dto/update-property-listing.dto';
import { PropertyListingService } from '../services/property-listing.service';

@ApiTags('Property Listings')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('property-listings')
export class PropertyListingController {
  constructor(
    private readonly propertyListingService: PropertyListingService,
  ) {}

  @Post()
  @RequireAnyPermission('property.update.own', 'property.update.any')
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
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePropertyListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertyListingService.create(dto, tenantId, user);
  }

  @Get()
  @ApiOperation({ summary: 'List property listings by tenant' })
  @ApiOkResponse({
    description: 'List of property listings',
    type: PropertyListingResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPropertyListingsQueryDto,
  ) {
    return this.propertyListingService.findAll(tenantId, {
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
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.propertyListingService.findOne(id, tenantId);
  }

  @Patch(':id')
  @RequireAnyPermission('property.update.own', 'property.update.any')
  @ApiOperation({ summary: 'Update a property listing' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyListingDto })
  @ApiOkResponse({
    description: 'Property listing updated successfully',
    type: PropertyListingResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, invalid status transition, publication checklist incomplete, or invalid query',
  })
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePropertyListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertyListingService.update(id, tenantId, dto, user);
  }

  @Delete(':id')
  @RequireAnyPermission('property.update.own', 'property.update.any')
  @ApiOperation({ summary: 'Close a property listing (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property listing closed successfully',
    type: PropertyListingResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property listing not found' })
  remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertyListingService.remove(id, tenantId, user);
  }
}
