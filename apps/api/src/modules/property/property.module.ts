import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { PropertyImageModule } from '../property-image/property-image.module';
import { PropertyListingModule } from '../property-listing/property-listing.module';
import { PropertyPriceModule } from '../property-price/property-price.module';
import { PropertyAccessService } from './services/property-access.service';
import { PropertyController } from './controllers/property.controller';
import { PropertyRepository } from './repositories/property.repository';
import { PropertyGeoService } from './services/property-geo.service';
import { PropertyPublishabilityService } from './services/property-publishability.service';
import { PropertyService } from './services/property.service';
import { PropertyDetailContextController } from './controllers/property-detail-context.controller';
import { PropertyDetailContextRepository } from './repositories/property-detail-context.repository';
import { PropertyDetailContextService } from './services/property-detail-context.service';

@Module({
  imports: [
    AuthModule,
    GeoModule,
    forwardRef(() => PropertyListingModule),
    forwardRef(() => PropertyImageModule),
    forwardRef(() => PropertyPriceModule),
  ],
  controllers: [PropertyController, PropertyDetailContextController],
  providers: [
    PropertyDetailContextRepository,
    PropertyDetailContextService,
    PropertyService,
    PropertyGeoService,
    PropertyRepository,
    PropertyPublishabilityService,
    PropertyAccessService,
  ],
  exports: [
    PropertyService,
    PropertyRepository,
    PropertyPublishabilityService,
    PropertyAccessService,
  ],
})
export class PropertyModule {}
