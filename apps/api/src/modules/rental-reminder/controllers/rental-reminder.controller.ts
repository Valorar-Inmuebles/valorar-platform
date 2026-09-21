import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  RentalReminderPageQueryDto,
  RentalReminderPlanningIssueQueryDto,
  UpdateRentalReminderPolicyDto,
} from '../dto/rental-reminder.dto';
import { RentalReminderService } from '../services/rental-reminder.service';

@ApiTags('Rental Reminder Policy')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@RequirePermissions('rental.reminder.manage')
@Controller('rental-reminder-policy')
export class RentalReminderPolicyController {
  constructor(private readonly service: RentalReminderService) {}

  @Get()
  @ApiOkResponse({ description: 'Tenant-wide rental reminder policy' })
  get(@CurrentTenant() tenantId: string) {
    return this.service.getPolicy(tenantId);
  }

  @Put()
  @ApiOkResponse({ description: 'Updated tenant-wide rental reminder policy' })
  update(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalReminderPolicyDto,
  ) {
    return this.service.updatePolicy(tenantId, dto);
  }
}

@ApiTags('Rental Reminder Communications')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@RequirePermissions('rental.reminder.manage')
@Controller('rental-reminder-communications')
export class RentalReminderCommunicationController {
  constructor(private readonly service: RentalReminderService) {}

  @Get('planning-issues')
  planningIssues(
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderPlanningIssueQueryDto,
  ) {
    return this.service.listPlanningIssues(tenantId, query);
  }

  @Get('dispatches')
  dispatches(
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderDispatchQueryDto,
  ) {
    return this.service.listDispatches(tenantId, query);
  }

  @Get('deliveries')
  deliveries(
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderDeliveryQueryDto,
  ) {
    return this.service.listDeliveries(tenantId, query);
  }

  @Get('deliveries/:id/attempts')
  attempts(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderPageQueryDto,
  ) {
    return this.service.listAttempts(tenantId, id, query);
  }
}
