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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import {
  ContactPointResponseDto,
  CreateContactPointDto,
  UpdateContactPointDto,
} from '../dto/contact-point.dto';
import { ListContactsQueryDto } from '../dto/contact-query.dto';
import { ContactResponseDto } from '../dto/contact-response.dto';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { ContactService } from '../services/contact.service';

@ApiTags('Rental Contacts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @RequirePermissions('rental.read')
  @ApiOperation({ summary: 'List or search contacts for the active tenant' })
  @ApiOkResponse({ type: ContactResponseDto, isArray: true })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.contactService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('rental.read')
  @ApiOkResponse({ type: ContactResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.contactService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('rental.contact.manage')
  @ApiCreatedResponse({ type: ContactResponseDto })
  @ApiBadRequestResponse()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateContactDto) {
    return this.contactService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('rental.contact.manage')
  @ApiOkResponse({ type: ContactResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(id, tenantId, dto);
  }

  @Post(':contactId/points')
  @RequirePermissions('rental.contact.manage')
  @ApiCreatedResponse({ type: ContactPointResponseDto })
  addPoint(
    @Param('contactId') contactId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateContactPointDto,
  ) {
    return this.contactService.addPoint(contactId, tenantId, dto);
  }

  @Patch(':contactId/points/:pointId')
  @RequirePermissions('rental.contact.manage')
  @ApiOkResponse({ type: ContactPointResponseDto })
  updatePoint(
    @Param('contactId') contactId: string,
    @Param('pointId') pointId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateContactPointDto,
  ) {
    return this.contactService.updatePoint(contactId, pointId, tenantId, dto);
  }

  @Post(':contactId/points/:pointId/default')
  @RequirePermissions('rental.contact.manage')
  @ApiOkResponse({ type: ContactPointResponseDto })
  markPointDefault(
    @Param('contactId') contactId: string,
    @Param('pointId') pointId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.contactService.markPointDefault(contactId, pointId, tenantId);
  }
}
