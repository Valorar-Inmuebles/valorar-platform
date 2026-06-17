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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePropertyFeatureDto } from '../dto/create-property-feature.dto';
import { ListPropertyFeaturesQueryDto } from '../dto/property-feature-query.dto';
import { PropertyFeatureResponseDto } from '../dto/property-feature-response.dto';
import { UpdatePropertyFeatureDto } from '../dto/update-property-feature.dto';
import { PropertyFeatureService } from '../services/property-feature.service';

@ApiTags('Property Features')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@Controller('property-features')
export class PropertyFeatureController {
  constructor(private readonly propertyFeatureService: PropertyFeatureService) {}

  @Get()
  @ApiOperation({
    summary: 'List global property features',
    description:
      'Available to all authenticated users. Optional filters: category, isActive.',
  })
  @ApiQuery({ name: 'category', required: false, enum: ['GENERAL', 'SERVICE', 'ROOM', 'AMENITY'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'List of property features',
    type: PropertyFeatureResponseDto,
    isArray: true,
  })
  findAll(@Query() query: ListPropertyFeaturesQueryDto) {
    return this.propertyFeatureService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property feature by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property feature details',
    type: PropertyFeatureResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property feature not found' })
  findOne(@Param('id') id: string) {
    return this.propertyFeatureService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a global property feature (SUPER_ADMIN)' })
  @ApiBody({ type: CreatePropertyFeatureDto })
  @ApiCreatedResponse({
    description: 'Property feature created successfully',
    type: PropertyFeatureResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN role required' })
  create(@Body() dto: CreatePropertyFeatureDto) {
    return this.propertyFeatureService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a property feature (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyFeatureDto })
  @ApiOkResponse({
    description: 'Property feature updated successfully',
    type: PropertyFeatureResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Property feature not found' })
  @ApiConflictResponse({ description: 'Slug already exists' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN role required' })
  update(@Param('id') id: string, @Body() dto: UpdatePropertyFeatureDto) {
    return this.propertyFeatureService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Deactivate a property feature (SUPER_ADMIN)',
    description: 'Soft delete: sets isActive = false.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property feature deactivated successfully',
    type: PropertyFeatureResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property feature not found' })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN role required' })
  remove(@Param('id') id: string) {
    return this.propertyFeatureService.remove(id);
  }
}
