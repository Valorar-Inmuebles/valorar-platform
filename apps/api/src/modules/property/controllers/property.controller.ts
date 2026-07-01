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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyPublishabilityQueryDto } from '../dto/property-publishability-query.dto';
import { PropertyPublishabilityResponseDto } from '../dto/property-publishability-response.dto';
import { PropertyPublishabilitySummaryItemDto } from '../dto/property-publishability-summary.dto';
import { ListPropertiesQueryDto } from '../dto/property-query.dto';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertyPublishabilityService } from '../services/property-publishability.service';
import { PropertyService } from '../services/property.service';

@ApiTags('Properties')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertyPublishabilityService: PropertyPublishabilityService,
  ) {}

  @Post()
  @RequirePermissions('property.create')
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
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.create(dto, tenantId, user.id);
  }

  @Get()
  @RequirePermissions('property.read')
  @ApiOperation({ summary: 'List properties by tenant' })
  @ApiOkResponse({
    description: 'List of properties',
    type: PropertyResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPropertiesQueryDto,
  ) {
    return this.propertyService.findAll(tenantId, user, query.isActive);
  }

  @Get('publishability-summary')
  @ApiOperation({
    summary: 'Batch publishability summary for all tenant properties',
  })
  @ApiOkResponse({
    description: 'Commercial status and public URL per property',
    type: PropertyPublishabilitySummaryItemDto,
    isArray: true,
  })
  findPublishabilitySummary(@CurrentTenant() tenantId: string) {
    return this.propertyPublishabilityService.summarizeForTenant(tenantId);
  }

  @Get(':id/publishability')
  @ApiOperation({
    summary: 'Get publication checklist for a property listing',
  })
  @ApiParam({ name: 'id', type: String, description: 'Property id' })
  @ApiQuery({
    name: 'listingId',
    required: true,
    type: String,
    description: 'Property listing id to evaluate',
  })
  @ApiOkResponse({
    description: 'Publication checklist result',
    type: PropertyPublishabilityResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({
    description: 'Property or listing not found for this tenant',
  })
  findPublishability(
    @Param('id') id: string,
    @Query() query: PropertyPublishabilityQueryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.propertyPublishabilityService.evaluate(
      id,
      query.listingId,
      tenantId,
    );
  }

  @Get(':id')
  @RequirePermissions('property.read')
  @ApiOperation({ summary: 'Get a property by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Property details', type: PropertyResponseDto })
  @ApiNotFoundResponse({ description: 'Property not found' })
  findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertyService.findOne(id, tenantId, user);
  }

  @Patch(':id')
  @RequireAnyPermission('property.update.own', 'property.update.any')
  @ApiOperation({ summary: 'Update a property' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyDto })
  @ApiOkResponse({
    description: 'Property updated successfully',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error or slug locked' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({
    description: 'Slug or internalCode already exists for tenant',
  })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(id, tenantId, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('property.delete')
  @ApiOperation({ summary: 'Archive a property (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property archived successfully',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.propertyService.remove(id, tenantId, user);
  }
}
