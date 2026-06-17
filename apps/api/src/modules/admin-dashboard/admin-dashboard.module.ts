import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyListingModule } from '../property-listing/property-listing.module';
import { PropertyModule } from '../property/property.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [AuthModule, PropertyModule, PropertyListingModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
