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
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '../../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateRentalContractDto } from '../dto/create-rental-contract.dto';
import { ListRentalContractsQueryDto } from '../dto/rental-contract-query.dto';
import { RentalContractResponseDto } from '../dto/rental-contract-response.dto';
import { UpdateRentalContractDto } from '../dto/update-rental-contract.dto';
import { RentalContractService } from '../services/rental-contract.service';

@ApiTags('Rental Contracts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('rental-contracts')
export class RentalContractController {
  constructor(private readonly service: RentalContractService) {}

  @Get()
  @RequirePermissions('rental.read')
  @ApiOkResponse({ type: RentalContractResponseDto, isArray: true })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRentalContractsQueryDto,
  ) {
    return this.service.findAll(tenantId, query.status);
  }

  @Get(':id')
  @RequirePermissions('rental.read')
  @ApiOkResponse({ type: RentalContractResponseDto })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('rental.contract.create')
  @ApiCreatedResponse({ type: RentalContractResponseDto })
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRentalContractDto,
  ) {
    const createdById = user.role === UserRole.SUPER_ADMIN ? null : user.id;
    return this.service.create(tenantId, createdById, dto);
  }

  @Patch(':id')
  @RequirePermissions('rental.contract.update')
  @ApiOkResponse({ type: RentalContractResponseDto })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalContractDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('rental.contract.update')
  @ApiOkResponse({ type: RentalContractResponseDto })
  activate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.activate(id, tenantId);
  }

  @Post(':id/end')
  @RequirePermissions('rental.contract.end')
  @ApiOkResponse({ type: RentalContractResponseDto })
  end(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const actorId = user.role === UserRole.SUPER_ADMIN ? null : user.id;
    return this.service.end(id, tenantId, actorId);
  }

  @Post(':id/cancel')
  @RequirePermissions('rental.contract.end')
  @ApiOkResponse({ type: RentalContractResponseDto })
  cancel(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const actorId = user.role === UserRole.SUPER_ADMIN ? null : user.id;
    return this.service.cancel(id, tenantId, actorId);
  }
}
