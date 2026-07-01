import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePlatformTenantDto } from '../dto/create-platform-tenant.dto';
import { PlatformTenantListResponseDto } from '../dto/platform-tenant-list-response.dto';
import { PlatformTenantOptionDto } from '../dto/platform-tenant-option.dto';
import { PlatformTenantResponseDto } from '../dto/platform-tenant-response.dto';
import { PlatformTenantStatsDto } from '../dto/platform-tenant-stats.dto';
import { UpdatePlatformTenantDto } from '../dto/update-platform-tenant.dto';
import { PlatformTenantService } from '../services/platform-tenant.service';

@ApiTags('Platform Tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('platform/tenants')
export class PlatformTenantController {
  constructor(private readonly platformTenantService: PlatformTenantService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants with platform stats (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantListResponseDto })
  @ApiForbiddenResponse({ description: 'SUPER_ADMIN role required' })
  listTenants() {
    return this.platformTenantService.listTenants();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform KPI stats (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantStatsDto })
  getStats() {
    return this.platformTenantService.getStats();
  }

  @Get('options')
  @ApiOperation({
    summary: 'Active tenants for switcher (SUPER_ADMIN)',
  })
  @ApiOkResponse({ type: PlatformTenantOptionDto, isArray: true })
  listOptions() {
    return this.platformTenantService.listActiveOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by id (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  getTenant(@Param('id') id: string) {
    return this.platformTenantService.getTenant(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant (SUPER_ADMIN)' })
  @ApiCreatedResponse({ type: PlatformTenantResponseDto })
  createTenant(@Body() dto: CreatePlatformTenantDto) {
    return this.platformTenantService.createTenant(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  updateTenant(@Param('id') id: string, @Body() dto: UpdatePlatformTenantDto) {
    return this.platformTenantService.updateTenant(id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend tenant (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  suspendTenant(@Param('id') id: string) {
    return this.platformTenantService.suspendTenant(id);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate tenant (SUPER_ADMIN)' })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  reactivateTenant(@Param('id') id: string) {
    return this.platformTenantService.reactivateTenant(id);
  }
}
