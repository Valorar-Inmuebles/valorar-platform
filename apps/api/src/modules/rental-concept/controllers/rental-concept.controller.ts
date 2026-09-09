import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateRentalConceptDto } from '../dto/create-rental-concept.dto';
import { RentalConceptResponseDto } from '../dto/rental-concept-response.dto';
import { UpdateRentalConceptDto } from '../dto/update-rental-concept.dto';
import { RentalConceptService } from '../services/rental-concept.service';

@ApiTags('Rental Concepts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('rental-concepts')
export class RentalConceptController {
  constructor(private readonly service: RentalConceptService) {}

  @Get()
  @RequirePermissions('rental.read')
  @ApiOkResponse({ type: RentalConceptResponseDto, isArray: true })
  findActive(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get('all')
  @RequirePermissions('rental.contract.update')
  @ApiOkResponse({ type: RentalConceptResponseDto, isArray: true })
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId, true);
  }

  @Post()
  @RequirePermissions('rental.contract.update')
  @ApiCreatedResponse({ type: RentalConceptResponseDto })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateRentalConceptDto,
  ) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('rental.contract.update')
  @ApiOkResponse({ type: RentalConceptResponseDto })
  updateActive(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateRentalConceptDto,
  ) {
    return this.service.setActive(id, tenantId, dto.isActive);
  }
}
