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
import { CreatePropertyImageDto } from '../dto/create-property-image.dto';
import { CreatePropertyImageUploadUrlDto } from '../dto/create-property-image-upload-url.dto';
import { ListPropertyImagesQueryDto } from '../dto/property-image-query.dto';
import { PropertyImageResponseDto } from '../dto/property-image-response.dto';
import { ReorderPropertyImagesDto } from '../dto/reorder-property-images.dto';
import { UpdatePropertyImageDto } from '../dto/update-property-image.dto';
import { PropertyImageService } from '../services/property-image.service';

@ApiTags('Property Images')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('property-images')
export class PropertyImageController {
  constructor(private readonly propertyImageService: PropertyImageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create a signed upload URL for a property image' })
  @ApiBody({ type: CreatePropertyImageUploadUrlDto })
  @ApiCreatedResponse({
    description: 'Signed upload URL generated',
    type: StorageUploadUrlResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error, property archived, or image limit reached',
  })
  @ApiServiceUnavailableResponse({ description: 'Storage not configured' })
  createUploadUrl(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePropertyImageUploadUrlDto,
  ) {
    return this.propertyImageService.createUploadUrl(dto, tenantId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Batch reorder property images' })
  @ApiBody({ type: ReorderPropertyImagesDto })
  @ApiOkResponse({
    description: 'Property images reordered successfully',
    type: PropertyImageResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid items or image does not belong to property',
  })
  @ApiNotFoundResponse({ description: 'Property or images not found' })
  reorder(
    @CurrentTenant() tenantId: string,
    @Body() dto: ReorderPropertyImagesDto,
  ) {
    return this.propertyImageService.reorder(dto, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a property image record after upload' })
  @ApiBody({ type: CreatePropertyImageDto })
  @ApiCreatedResponse({
    description: 'Property image created successfully',
    type: PropertyImageResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, tenant not found, property not found, or property archived',
  })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePropertyImageDto,
  ) {
    return this.propertyImageService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List property images by tenant and property' })
  @ApiQuery({ name: 'propertyId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of property images',
    type: PropertyImageResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or property not found',
  })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListPropertyImagesQueryDto,
  ) {
    return this.propertyImageService.findAll(tenantId, query.propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property image by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property image details',
    type: PropertyImageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.propertyImageService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property image' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyImageDto })
  @ApiOkResponse({
    description: 'Property image updated successfully',
    type: PropertyImageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid query',
  })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePropertyImageDto,
  ) {
    return this.propertyImageService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a property image and remove the file from storage',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description:
      'Property image deleted successfully. Returns a snapshot of the deleted image (pre-delete state).',
    type: PropertyImageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.propertyImageService.remove(id, tenantId);
  }
}
