import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/client';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateRentalObligationDto } from '../dto/create-rental-obligation.dto';
import { CreateRentValueRevisionDto } from '../dto/create-rent-value-revision.dto';
import { ListRentalObligationsQueryDto } from '../dto/rental-obligation-query.dto';
import {
  CancelRentalOccurrenceDto,
  ListRentalOccurrencesQueryDto,
  RecordRentalFulfillmentDto,
  ReverseRentalFulfillmentDto,
  UpdateRentalOccurrenceAmountDto,
  UpdateRentalOccurrenceDueDateDto,
} from '../dto/rental-occurrence.dto';
import { UpdateRentalObligationDto } from '../dto/update-rental-obligation.dto';
import { RentalObligationService } from '../services/rental-obligation.service';

@ApiTags('Rental Obligations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('rental-obligations')
export class RentalObligationController {
  constructor(private readonly service: RentalObligationService) {}

  @Get()
  @RequirePermissions('rental.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRentalObligationsQueryDto,
  ) {
    return this.service.listObligations(query.contractId, tenantId);
  }

  @Post()
  @RequirePermissions('rental.obligation.manage')
  @ApiCreatedResponse()
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRentalObligationDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('rental.obligation.manage')
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalObligationDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Post(':id/rent-adjustments')
  @RequirePermissions('rental.obligation.manage')
  @ApiCreatedResponse()
  createRentAdjustment(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRentValueRevisionDto,
  ) {
    return this.service.createRentAdjustment(
      id,
      tenantId,
      user.role === UserRole.SUPER_ADMIN ? null : user.id,
      dto,
    );
  }

  @Post(':id/materialize')
  @RequirePermissions('rental.obligation.manage')
  materialize(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.materialize(id, tenantId);
  }
}

@ApiTags('Rental Occurrences')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('rental-occurrences')
export class RentalOccurrenceController {
  constructor(private readonly service: RentalObligationService) {}

  @Get()
  @RequirePermissions('rental.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRentalOccurrencesQueryDto,
  ) {
    return this.service.listOccurrences(tenantId, query);
  }

  @Get('upcoming')
  @RequirePermissions('rental.read')
  upcoming(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRentalOccurrencesQueryDto,
  ) {
    return this.service.listOccurrences(tenantId, query, true);
  }

  @Patch(':id/amount')
  @RequirePermissions('rental.obligation.manage')
  updateAmount(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalOccurrenceAmountDto,
  ) {
    return this.service.updateAmount(id, tenantId, dto.amount);
  }

  @Patch(':id/due-date')
  @RequirePermissions('rental.obligation.manage')
  updateDueDate(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalOccurrenceDueDateDto,
  ) {
    return this.service.updateDueDate(id, tenantId, dto.dueDate);
  }

  @Post(':id/cancel')
  @RequirePermissions('rental.obligation.manage')
  cancel(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelRentalOccurrenceDto,
  ) {
    return this.service.cancelOccurrence(
      id,
      tenantId,
      this.actorId(user),
      dto.reason,
    );
  }

  @Post(':id/fulfillments')
  @RequirePermissions('rental.fulfillment.manage')
  fulfill(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordRentalFulfillmentDto,
  ) {
    return this.service.recordFulfillment(
      id,
      tenantId,
      this.actorId(user),
      dto,
    );
  }

  private actorId(user: AuthenticatedUser) {
    return user.role === UserRole.SUPER_ADMIN ? null : user.id;
  }
}

@ApiTags('Rental Fulfillments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('rental-fulfillments')
export class RentalFulfillmentController {
  constructor(private readonly service: RentalObligationService) {}

  @Post(':id/reverse')
  @RequirePermissions('rental.fulfillment.manage')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
  reverse(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReverseRentalFulfillmentDto,
  ) {
    const actorId = user.role === UserRole.SUPER_ADMIN ? null : user.id;
    return this.service.reverseFulfillment(id, tenantId, actorId, dto.reason);
  }
}
