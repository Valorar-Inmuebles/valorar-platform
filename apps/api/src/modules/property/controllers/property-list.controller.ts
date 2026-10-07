import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { PropertyListQueryDto } from '../dto/property-list-query.dto';
import { PropertyListResponseDto } from '../dto/property-list-response.dto';
import { PropertyListService } from '../services/property-list.service';

@ApiTags('Properties')
@Controller('properties/list')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
export class PropertyListController {
  constructor(private readonly service: PropertyListService) {}

  @Get()
  @RequirePermissions('property.read')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Compact authorized property inventory, paginated in PostgreSQL',
  })
  @ApiOkResponse({
    type: PropertyListResponseDto,
    description: 'Compact page and unfiltered authorized commercialCounts',
  })
  @ApiBadRequestResponse({
    description:
      'Unknown, repeated or invalid query parameter, or missing effective tenant',
  })
  list(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PropertyListQueryDto,
  ) {
    return this.service.list(tenantId, user, query);
  }
}
