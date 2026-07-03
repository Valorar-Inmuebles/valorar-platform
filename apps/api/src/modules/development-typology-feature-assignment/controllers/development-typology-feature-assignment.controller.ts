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
import { AssignDevelopmentTypologyFeatureDto } from '../dto/assign-development-typology-feature.dto';
import { DevelopmentTypologyFeatureAssignmentResponseDto } from '../dto/development-typology-feature-assignment-response.dto';
import { ReplaceDevelopmentTypologyFeatureAssignmentsDto } from '../dto/replace-development-typology-feature-assignments.dto';
import { DevelopmentTypologyFeatureAssignmentService } from '../services/development-typology-feature-assignment.service';

@ApiTags('Development Typology Feature Assignments')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('development-typologies/:typologyId/features')
export class DevelopmentTypologyFeatureAssignmentController {
  constructor(
    private readonly assignmentService: DevelopmentTypologyFeatureAssignmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List feature assignments for a typology' })
  @ApiParam({ name: 'typologyId', type: String })
  @ApiOkResponse({
    type: DevelopmentTypologyFeatureAssignmentResponseDto,
    isArray: true,
  })
  findAll(
    @Param('typologyId') typologyId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.findAll(typologyId, tenantId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace all feature assignments for a typology' })
  @ApiParam({ name: 'typologyId', type: String })
  @ApiBody({ type: ReplaceDevelopmentTypologyFeatureAssignmentsDto })
  @ApiOkResponse({
    type: DevelopmentTypologyFeatureAssignmentResponseDto,
    isArray: true,
  })
  replaceAll(
    @Param('typologyId') typologyId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: ReplaceDevelopmentTypologyFeatureAssignmentsDto,
  ) {
    return this.assignmentService.replaceAll(typologyId, tenantId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Assign a single feature to a typology' })
  @ApiParam({ name: 'typologyId', type: String })
  @ApiBody({ type: AssignDevelopmentTypologyFeatureDto })
  @ApiCreatedResponse({ type: DevelopmentTypologyFeatureAssignmentResponseDto })
  @ApiConflictResponse()
  assign(
    @Param('typologyId') typologyId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: AssignDevelopmentTypologyFeatureDto,
  ) {
    return this.assignmentService.assign(typologyId, tenantId, dto);
  }

  @Delete(':featureId')
  @ApiOperation({ summary: 'Remove a feature assignment from a typology' })
  @ApiParam({ name: 'typologyId', type: String })
  @ApiParam({ name: 'featureId', type: String })
  @ApiOkResponse({ type: DevelopmentTypologyFeatureAssignmentResponseDto })
  unassign(
    @Param('typologyId') typologyId: string,
    @Param('featureId') featureId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assignmentService.unassign(typologyId, featureId, tenantId);
  }
}
