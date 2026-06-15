import { Module, forwardRef } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { PropertyPriceModule } from '../property-price/property-price.module';
import { PropertyListingController } from './controllers/property-listing.controller';
import { PropertyListingRepository } from './repositories/property-listing.repository';
import { PropertyListingService } from './services/property-listing.service';

@Module({
  imports: [PropertyModule, forwardRef(() => PropertyPriceModule)],
  controllers: [PropertyListingController],
  providers: [PropertyListingService, PropertyListingRepository],
  exports: [PropertyListingService, PropertyListingRepository],
})
export class PropertyListingModule {}
