import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyFeatureAssignmentModule } from '../property-feature-assignment/property-feature-assignment.module';
import { PropertyImageModule } from '../property-image/property-image.module';
import { PropertyListingModule } from '../property-listing/property-listing.module';
import { PropertyPriceModule } from '../property-price/property-price.module';
import { PropertyModule } from '../property/property.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [
    AuthModule,
    PropertyModule,
    PropertyListingModule,
    PropertyImageModule,
    PropertyPriceModule,
    PropertyFeatureAssignmentModule,
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
