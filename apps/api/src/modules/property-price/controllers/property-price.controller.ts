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
  ApiTags,
} from '@nestjs/swagger';
import { CreatePropertyPriceDto } from '../dto/create-property-price.dto';
import {
  ListPropertyPricesQueryDto,
  PropertyPriceTenantQueryDto,
} from '../dto/property-price-query.dto';
import { PropertyPriceResponseDto } from '../dto/property-price-response.dto';
import { UpdatePropertyPriceDto } from '../dto/update-property-price.dto';
import { PropertyPriceService } from '../services/property-price.service';

@ApiTags('Property Prices')
@Controller('property-prices')
export class PropertyPriceController {
  constructor(private readonly propertyPriceService: PropertyPriceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property price' })
  @ApiBody({ type: CreatePropertyPriceDto })
  @ApiCreatedResponse({
    description: 'Property price created successfully',
    type: PropertyPriceResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, tenant not found, or property listing not found',
  })
  create(@Body() dto: CreatePropertyPriceDto) {
    return this.propertyPriceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List property prices by tenant and listing' })
  @ApiOkResponse({
    description: 'List of property prices',
    type: PropertyPriceResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: ListPropertyPricesQueryDto) {
    return this.propertyPriceService.findAll(query.tenantId, query.listingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property price by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property price details',
    type: PropertyPriceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  @ApiNotFoundResponse({ description: 'Property price not found' })
  findOne(
    @Param('id') id: string,
    @Query() query: PropertyPriceTenantQueryDto,
  ) {
    return this.propertyPriceService.findOne(id, query.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property price' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePropertyPriceDto })
  @ApiOkResponse({
    description: 'Property price updated successfully',
    type: PropertyPriceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error or invalid query',
  })
  @ApiNotFoundResponse({ description: 'Property price not found' })
  update(
    @Param('id') id: string,
    @Query() query: PropertyPriceTenantQueryDto,
    @Body() dto: UpdatePropertyPriceDto,
  ) {
    return this.propertyPriceService.update(id, query.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a property price (physical delete)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({
    description: 'Property price deleted successfully',
    type: PropertyPriceResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid query parameters or cannot delete the only price of an active listing',
  })
  @ApiNotFoundResponse({ description: 'Property price not found' })
  remove(
    @Param('id') id: string,
    @Query() query: PropertyPriceTenantQueryDto,
  ) {
    return this.propertyPriceService.remove(id, query.tenantId);
  }
}
