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
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateDevelopmentDto } from '../dto/create-development.dto';
import { ListDevelopmentsQueryDto } from '../dto/development-query.dto';
import { DevelopmentResponseDto } from '../dto/development-response.dto';
import { UpdateDevelopmentDto } from '../dto/update-development.dto';
import { DevelopmentService } from '../services/development.service';

@ApiTags('Developments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('developments')
export class DevelopmentController {
  constructor(private readonly developmentService: DevelopmentService) {}

  @Post()
  @RequirePermissions('development.create')
  @ApiOperation({ summary: 'Create a development' })
  @ApiBody({ type: CreateDevelopmentDto })
  @ApiCreatedResponse({ type: DevelopmentResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDevelopmentDto,
  ) {
    return this.developmentService.create(dto, tenantId, user.id);
  }

  @Get()
  @RequirePermissions('development.read')
  @ApiOperation({ summary: 'List developments by tenant' })
  @ApiOkResponse({ type: DevelopmentResponseDto, isArray: true })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListDevelopmentsQueryDto,
  ) {
    return this.developmentService.findAll(tenantId, query.isActive);
  }

  @Get(':id')
  @RequirePermissions('development.read')
  @ApiOperation({ summary: 'Get development by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DevelopmentResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.developmentService.findOne(id, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('development.update')
  @ApiOperation({ summary: 'Update a development' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDevelopmentDto })
  @ApiOkResponse({ type: DevelopmentResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDevelopmentDto,
  ) {
    return this.developmentService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @RequirePermissions('development.delete')
  @ApiOperation({ summary: 'Archive a development (isActive = false)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DevelopmentResponseDto })
  @ApiNotFoundResponse()
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.developmentService.remove(id, tenantId);
  }
}
