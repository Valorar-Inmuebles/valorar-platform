import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationService } from '../services/organization.service';

@ApiTags('Organization')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization settings for active tenant' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  getOrganization(@CurrentTenant() tenantId: string) {
    return this.organizationService.getOrganization(tenantId);
  }

  @Patch()
  @RequirePermissions('organization.update')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  updateOrganization(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateOrganization(tenantId, dto);
  }
}
