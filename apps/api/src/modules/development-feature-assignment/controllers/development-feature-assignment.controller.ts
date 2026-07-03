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
import { AssignDevelopmentFeatureDto } from '../dto/assign-development-feature.dto';
import { DevelopmentFeatureAssignmentResponseDto } from '../dto/development-feature-assignment-response.dto';
import { ReplaceDevelopmentFeatureAssignmentsDto } from '../dto/replace-development-feature-assignments.dto';
import { DevelopmentFeatureAssignmentService } from '../services/development-feature-assignment.service';

@ApiTags('Development Feature Assignments')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('developments/:developmentId/features')
export class DevelopmentFeatureAssignmentController {
  constructor(
    private readonly assignmentService: DevelopmentFeatureAssignmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List feature assignments for a development' })
  @ApiParam({ name: 'developmentId', type: String })
  @ApiOkResponse({
    description: 'Assigned features with catalog metadata',
    type: DevelopmentFeatureAssignmentResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Development not found for this tenant' })
  findAll(
    @Param('developmentId') developmentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.findAll(developmentId, tenantId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace all feature assignments for a development',
    description:
      'Transactional bulk replace: deletes current assignments and inserts the provided set.',
  })
  @ApiParam({ name: 'developmentId', type: String })
  @ApiBody({ type: ReplaceDevelopmentFeatureAssignmentsDto })
  @ApiOkResponse({
    description: 'Assignments replaced successfully',
    type: DevelopmentFeatureAssignmentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, inactive feature, or duplicate featureId in request',
  })
  @ApiNotFoundResponse({ description: 'Development not found for this tenant' })
  replaceAll(
    @Param('developmentId') developmentId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: ReplaceDevelopmentFeatureAssignmentsDto,
  ) {
    return this.assignmentService.replaceAll(developmentId, tenantId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a single feature to a development' })
  @ApiParam({ name: 'developmentId', type: String })
  @ApiBody({ type: AssignDevelopmentFeatureDto })
  @ApiCreatedResponse({
    description: 'Feature assigned successfully',
    type: DevelopmentFeatureAssignmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error, feature not found, or feature inactive',
  })
  @ApiConflictResponse({
    description: 'Feature already assigned to this development',
  })
  @ApiNotFoundResponse({ description: 'Development not found for this tenant' })
  assign(
    @Param('developmentId') developmentId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: AssignDevelopmentFeatureDto,
  ) {
    return this.assignmentService.assign(developmentId, tenantId, dto);
  }

  @Delete(':featureId')
  @ApiOperation({ summary: 'Remove a feature assignment from a development' })
  @ApiParam({ name: 'developmentId', type: String })
  @ApiParam({ name: 'featureId', type: String })
  @ApiOkResponse({
    description: 'Assignment removed successfully',
    type: DevelopmentFeatureAssignmentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Development or assignment not found for this tenant',
  })
  unassign(
    @Param('developmentId') developmentId: string,
    @Param('featureId') featureId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.unassign(
      developmentId,
      featureId,
      tenantId,
    );
  }
}
