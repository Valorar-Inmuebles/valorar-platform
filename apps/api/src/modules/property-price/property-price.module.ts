import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyListingModule } from '../property-listing/property-listing.module';
import { PropertyPriceController } from './controllers/property-price.controller';
import { PropertyPriceRepository } from './repositories/property-price.repository';
import { PropertyPriceService } from './services/property-price.service';

@Module({
  imports: [AuthModule, forwardRef(() => PropertyListingModule)],
  controllers: [PropertyPriceController],
  providers: [PropertyPriceService, PropertyPriceRepository],
  exports: [PropertyPriceService, PropertyPriceRepository],
})
export class PropertyPriceModule {}
