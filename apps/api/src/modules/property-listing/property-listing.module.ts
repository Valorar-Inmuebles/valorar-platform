import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyImageModule } from '../property-image/property-image.module';
import { PropertyModule } from '../property/property.module';
import { PropertyPriceModule } from '../property-price/property-price.module';
import { PropertyListingController } from './controllers/property-listing.controller';
import { PropertyListingRepository } from './repositories/property-listing.repository';
import { ListingOperationalTrustService } from './services/listing-operational-trust.service';
import { PropertyListingService } from './services/property-listing.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => PropertyModule),
    forwardRef(() => PropertyImageModule),
    forwardRef(() => PropertyPriceModule),
  ],
  controllers: [PropertyListingController],
  providers: [
    PropertyListingService,
    PropertyListingRepository,
    ListingOperationalTrustService,
  ],
  exports: [
    PropertyListingService,
    PropertyListingRepository,
    ListingOperationalTrustService,
  ],
})
export class PropertyListingModule {}
