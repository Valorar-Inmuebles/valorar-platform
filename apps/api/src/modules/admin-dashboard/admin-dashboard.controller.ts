import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequireTenant } from '../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@ApiTags('Admin Dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get operational dashboard summary for active tenant' })
  @ApiOkResponse({
    description: 'Dashboard KPIs and publication alerts',
    type: DashboardSummaryResponseDto,
  })
  getSummary(@CurrentTenant() tenantId: string) {
    return this.adminDashboardService.getSummary(tenantId);
  }
}
