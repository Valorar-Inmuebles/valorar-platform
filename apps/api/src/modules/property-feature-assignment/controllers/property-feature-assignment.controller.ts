import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { AssignPropertyFeatureDto } from '../dto/assign-property-feature.dto';
import { PropertyFeatureAssignmentResponseDto } from '../dto/property-feature-assignment-response.dto';
import { ReplacePropertyFeatureAssignmentsDto } from '../dto/replace-property-feature-assignments.dto';
import { PropertyFeatureAssignmentService } from '../services/property-feature-assignment.service';

@ApiTags('Property Feature Assignments')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('properties/:propertyId/features')
export class PropertyFeatureAssignmentController {
  constructor(
    private readonly assignmentService: PropertyFeatureAssignmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List feature assignments for a property' })
  @ApiParam({ name: 'propertyId', type: String })
  @ApiOkResponse({
    description: 'Assigned features with catalog metadata',
    type: PropertyFeatureAssignmentResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Property not found for this tenant' })
  findAll(
    @Param('propertyId') propertyId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.findAll(propertyId, tenantId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace all feature assignments for a property',
    description:
      'Transactional bulk replace: deletes current assignments and inserts the provided set.',
  })
  @ApiParam({ name: 'propertyId', type: String })
  @ApiBody({ type: ReplacePropertyFeatureAssignmentsDto })
  @ApiOkResponse({
    description: 'Assignments replaced successfully',
    type: PropertyFeatureAssignmentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, inactive feature, or duplicate featureId in request',
  })
  @ApiNotFoundResponse({ description: 'Property not found for this tenant' })
  replaceAll(
    @Param('propertyId') propertyId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: ReplacePropertyFeatureAssignmentsDto,
  ) {
    return this.assignmentService.replaceAll(propertyId, tenantId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a single feature to a property' })
  @ApiParam({ name: 'propertyId', type: String })
  @ApiBody({ type: AssignPropertyFeatureDto })
  @ApiCreatedResponse({
    description: 'Feature assigned successfully',
    type: PropertyFeatureAssignmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error, feature not found, or feature inactive',
  })
  @ApiConflictResponse({
    description: 'Feature already assigned to this property',
  })
  @ApiNotFoundResponse({ description: 'Property not found for this tenant' })
  assign(
    @Param('propertyId') propertyId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: AssignPropertyFeatureDto,
  ) {
    return this.assignmentService.assign(propertyId, tenantId, dto);
  }

  @Delete(':featureId')
  @ApiOperation({ summary: 'Remove a feature assignment from a property' })
  @ApiParam({ name: 'propertyId', type: String })
  @ApiParam({ name: 'featureId', type: String })
  @ApiOkResponse({
    description: 'Assignment removed successfully',
    type: PropertyFeatureAssignmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Property or assignment not found for this tenant',
  })
  unassign(
    @Param('propertyId') propertyId: string,
    @Param('featureId') featureId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.unassign(propertyId, featureId, tenantId);
  }
}
