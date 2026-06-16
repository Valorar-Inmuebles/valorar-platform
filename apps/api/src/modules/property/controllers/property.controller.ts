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
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { ListPropertiesQueryDto } from '../dto/property-query.dto';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertyService } from '../services/property.service';

@ApiTags('Properties')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
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
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.create(dto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List properties by tenant' })
  @ApiOkResponse({
    description: 'List of properties',
    type: PropertyResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPropertiesQueryDto,
  ) {
    return this.propertyService.findAll(tenantId, query.isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Property details', type: PropertyResponseDto })
  @ApiNotFoundResponse({ description: 'Property not found' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.propertyService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyDto })
  @ApiOkResponse({
    description: 'Property updated successfully',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Property not found' })
  @ApiConflictResponse({
    description: 'Slug or internalCode already exists for tenant',
  })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a property (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property archived successfully',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.propertyService.remove(id, tenantId);
  }
}
