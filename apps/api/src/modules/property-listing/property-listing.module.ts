import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { PropertyListingController } from './controllers/property-listing.controller';
import { PropertyListingRepository } from './repositories/property-listing.repository';
import { PropertyListingService } from './services/property-listing.service';

@Module({
  imports: [PropertyModule],
  controllers: [PropertyListingController],
  providers: [PropertyListingService, PropertyListingRepository],
  exports: [PropertyListingService, PropertyListingRepository],
})
export class PropertyListingModule {}
