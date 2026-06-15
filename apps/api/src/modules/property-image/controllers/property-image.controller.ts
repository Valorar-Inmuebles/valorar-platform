import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CreatePropertyImageDto } from '../dto/create-property-image.dto';
import {
  ListPropertyImagesQueryDto,
  PropertyImageTenantQueryDto,
} from '../dto/property-image-query.dto';
import { PropertyImageResponseDto } from '../dto/property-image-response.dto';
import { UpdatePropertyImageDto } from '../dto/update-property-image.dto';
import { PropertyImageService } from '../services/property-image.service';

@ApiTags('Property Images')
@Controller('property-images')
export class PropertyImageController {
  constructor(private readonly propertyImageService: PropertyImageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property image (metadata only)' })
  @ApiBody({ type: CreatePropertyImageDto })
  @ApiCreatedResponse({
    description: 'Property image created successfully',
    type: PropertyImageResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, tenant not found, property not found, or property archived',
  })
  create(@Body() dto: CreatePropertyImageDto) {
    return this.propertyImageService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List property images by tenant and property' })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiQuery({ name: 'propertyId', required: true, type: String })
  @ApiOkResponse({
    description: 'List of property images',
    type: PropertyImageResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or property not found',
  })
  findAll(@Query() query: ListPropertyImagesQueryDto) {
    return this.propertyImageService.findAll(query.tenantId, query.propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property image by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiOkResponse({
    description: 'Property image details',
    type: PropertyImageResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  findOne(
    @Param('id') id: string,
    @Query() query: PropertyImageTenantQueryDto,
  ) {
    return this.propertyImageService.findOne(id, query.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property image' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
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
    @Query() query: PropertyImageTenantQueryDto,
    @Body() dto: UpdatePropertyImageDto,
  ) {
    return this.propertyImageService.update(id, query.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a property image (physical delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'tenantId', required: true, type: String })
  @ApiOkResponse({
    description:
      'Property image deleted successfully. Returns a snapshot of the deleted image (pre-delete state).',
    type: PropertyImageResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  remove(@Param('id') id: string, @Query() query: PropertyImageTenantQueryDto) {
    return this.propertyImageService.remove(id, query.tenantId);
  }
}
