import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { PropertyImageModule } from '../property-image/property-image.module';
import { PropertyListingModule } from '../property-listing/property-listing.module';
import { PropertyPriceModule } from '../property-price/property-price.module';
import { PropertyController } from './controllers/property.controller';
import { PropertyRepository } from './repositories/property.repository';
import { PropertyGeoService } from './services/property-geo.service';
import { PropertyPublishabilityService } from './services/property-publishability.service';
import { PropertyService } from './services/property.service';

@Module({
  imports: [
    AuthModule,
    GeoModule,
    forwardRef(() => PropertyListingModule),
    forwardRef(() => PropertyImageModule),
    forwardRef(() => PropertyPriceModule),
  ],
  controllers: [PropertyController],
  providers: [
    PropertyService,
    PropertyGeoService,
    PropertyRepository,
    PropertyPublishabilityService,
  ],
  exports: [PropertyService, PropertyRepository, PropertyPublishabilityService],
})
export class PropertyModule {}
