import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateDevelopmentTypologyDto } from '../dto/create-development-typology.dto';
import { ListDevelopmentTypologiesQueryDto } from '../dto/development-typology-query.dto';
import { DevelopmentTypologyResponseDto } from '../dto/development-typology-response.dto';
import { UpdateDevelopmentTypologyDto } from '../dto/update-development-typology.dto';
import { DevelopmentTypologyService } from '../services/development-typology.service';

@ApiTags('Development Typologies')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('development-typologies')
export class DevelopmentTypologyController {
  constructor(
    private readonly typologyService: DevelopmentTypologyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a development typology' })
  @ApiBody({ type: CreateDevelopmentTypologyDto })
  @ApiCreatedResponse({
    description: 'Development typology created successfully',
    type: DevelopmentTypologyResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, tenant not found, or development not found',
  })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDevelopmentTypologyDto,
  ) {
    return this.typologyService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List development typologies by tenant and development' })
  @ApiQuery({ name: 'developmentId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of development typologies',
    type: DevelopmentTypologyResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or development not found',
  })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListDevelopmentTypologiesQueryDto,
  ) {
    return this.typologyService.findAll(tenantId, query.developmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a development typology by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Development typology details',
    type: DevelopmentTypologyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Development typology not found' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.typologyService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a development typology' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDevelopmentTypologyDto })
  @ApiOkResponse({
    description: 'Development typology updated successfully',
    type: DevelopmentTypologyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid field constraints',
  })
  @ApiNotFoundResponse({ description: 'Development typology not found' })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDevelopmentTypologyDto,
  ) {
    return this.typologyService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a development typology' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description:
      'Development typology deleted successfully. Returns a snapshot of the deleted typology (pre-delete state).',
    type: DevelopmentTypologyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Development typology not found' })
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.typologyService.remove(id, tenantId);
  }
}
