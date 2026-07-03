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
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { StorageUploadUrlResponseDto } from '../../storage/dto/storage-upload-url-response.dto';
import { CreateDevelopmentImageDto } from '../dto/create-development-image.dto';
import { CreateDevelopmentImageUploadUrlDto } from '../dto/create-development-image-upload-url.dto';
import { ListDevelopmentImagesQueryDto } from '../dto/development-image-query.dto';
import { DevelopmentImageResponseDto } from '../dto/development-image-response.dto';
import { ReorderDevelopmentImagesDto } from '../dto/reorder-development-images.dto';
import { UpdateDevelopmentImageDto } from '../dto/update-development-image.dto';
import { DevelopmentImageService } from '../services/development-image.service';

@ApiTags('Development Images')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('development-images')
export class DevelopmentImageController {
  constructor(
    private readonly developmentImageService: DevelopmentImageService,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create a signed upload URL for a development image' })
  @ApiBody({ type: CreateDevelopmentImageUploadUrlDto })
  @ApiCreatedResponse({
    description: 'Signed upload URL generated',
    type: StorageUploadUrlResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, development archived, or image limit reached',
  })
  @ApiServiceUnavailableResponse({ description: 'Storage not configured' })
  createUploadUrl(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDevelopmentImageUploadUrlDto,
  ) {
    return this.developmentImageService.createUploadUrl(dto, tenantId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Batch reorder development images' })
  @ApiBody({ type: ReorderDevelopmentImagesDto })
  @ApiOkResponse({
    description: 'Development images reordered successfully',
    type: DevelopmentImageResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid items or image does not belong to development',
  })
  @ApiNotFoundResponse({ description: 'Development or images not found' })
  reorder(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReorderDevelopmentImagesDto,
  ) {
    return this.developmentImageService.reorder(dto, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a development image record after upload' })
  @ApiBody({ type: CreateDevelopmentImageDto })
  @ApiCreatedResponse({
    description: 'Development image created successfully',
    type: DevelopmentImageResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, tenant not found, development not found, or development archived',
  })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateDevelopmentImageDto,
  ) {
    return this.developmentImageService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List development images by tenant and development' })
  @ApiQuery({ name: 'developmentId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of development images',
    type: DevelopmentImageResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or development not found',
  })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListDevelopmentImagesQueryDto,
  ) {
    return this.developmentImageService.findAll(tenantId, query.developmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a development image by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Development image details',
    type: DevelopmentImageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Development image not found' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.developmentImageService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a development image' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDevelopmentImageDto })
  @ApiOkResponse({
    description: 'Development image updated successfully',
    type: DevelopmentImageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid query',
  })
  @ApiNotFoundResponse({ description: 'Development image not found' })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateDevelopmentImageDto,
  ) {
    return this.developmentImageService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a development image and remove the file from storage',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description:
      'Development image deleted successfully. Returns a snapshot of the deleted image (pre-delete state).',
    type: DevelopmentImageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Development image not found' })
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.developmentImageService.remove(id, tenantId);
  }
}
