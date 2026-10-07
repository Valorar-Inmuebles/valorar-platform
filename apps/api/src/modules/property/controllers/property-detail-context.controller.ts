import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
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
import { PropertyDetailContextResponseDto } from '../dto/property-detail-context-response.dto';
import { PropertyDetailContextService } from '../services/property-detail-context.service';

@ApiTags('Properties')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('properties')
export class PropertyDetailContextController {
  constructor(private readonly service: PropertyDetailContextService) {}

  @Get(':id/detail-context')
  @RequirePermissions('property.read')
  @ApiOperation({ summary: 'Read visible property detail context in batch' })
  @ApiOkResponse({ type: PropertyDetailContextResponseDto })
  @ApiNotFoundResponse({ description: 'Property not found or not visible' })
  findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, tenantId, user);
  }
}
