import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PropertyLocationSearchDto } from '../dto/property-location-search.dto';
import { PropertyLocationSearchService } from '../services/property-location-search.service';

@ApiTags('Properties')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('properties')
export class PropertyLocationSearchController {
  constructor(private readonly searchService: PropertyLocationSearchService) {}

  @Post('location-search')
  @RequirePermissions('property.create')
  @ApiOperation({
    summary:
      'Suggest property coordinates from an entered address (no property write)',
  })
  create(
    @Body() dto: PropertyLocationSearchDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchService.search(dto, tenantId, user);
  }

  @Post(':id/location-search')
  @RequireAnyPermission('property.update.own', 'property.update.any')
  @ApiOperation({
    summary: 'Suggest coordinates for an editable property (no property write)',
  })
  edit(
    @Param('id') id: string,
    @Body() dto: PropertyLocationSearchDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchService.search(dto, tenantId, user, id);
  }
}
