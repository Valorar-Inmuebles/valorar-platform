import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
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
import {
  RentalReminderContractHistoryQueryDto,
  RentalReminderInboundQueryDto,
} from '../dto/rental-reminder-read-model.dto';
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

  @Post('deliveries/:id/retry')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Reopens a failed delivery for re-attempt, or a Conflict/Not Found ' +
      'payload with the canonical retry reason.',
  })
  retry(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.retryDelivery(tenantId, id);
  }
}

@ApiTags('Rental Reminder Read Models')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@RequirePermissions('rental.read')
@Controller('rental-reminder-communications')
export class RentalReminderReadController {
  constructor(private readonly service: RentalReminderService) {}

  @Get('contracts/:contractId/history')
  @ApiOkResponse({
    description:
      'Per-contract communications history: dispatches with occurrences and ' +
      'channel deliveries with embedded attempts. Destinations are masked; ' +
      'recipient snapshots are projected to contactId/name only.',
  })
  contractHistory(
    @Param('contractId') contractId: string,
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderContractHistoryQueryDto,
  ) {
    return this.service.getContractHistory(tenantId, contractId, query);
  }

  @Get('inbound')
  @ApiOkResponse({
    description:
      'Inbound WhatsApp messages (tenant-scoped). sender.address is masked; ' +
      'externalReplyLink exposes the destination number as functional PII.',
  })
  inbound(
    @CurrentTenant() tenantId: string,
    @Query() query: RentalReminderInboundQueryDto,
  ) {
    return this.service.getInbound(tenantId, query);
  }

  @Get('summary')
  @ApiOkResponse({
    description:
      'Today (tenant timezone) communications counters: scheduled dispatches, ' +
      'sent/delivered/failed deliveries and open planning issues.',
  })
  summary(@CurrentTenant() tenantId: string) {
    return this.service.getSummary(tenantId);
  }
}
