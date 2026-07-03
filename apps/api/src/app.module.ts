import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { UserModule } from './modules/user/user.module';
import { PublicPropertyModule } from './modules/public-property/public-property.module';
import { PropertyFeatureAssignmentModule } from './modules/property-feature-assignment/property-feature-assignment.module';
import { PropertyFeatureModule } from './modules/property-feature/property-feature.module';
import { PropertyImageModule } from './modules/property-image/property-image.module';
import { PropertyListingModule } from './modules/property-listing/property-listing.module';
import { PropertyModule } from './modules/property/property.module';
import { PropertyPriceModule } from './modules/property-price/property-price.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { DevelopmentFeatureAssignmentModule } from './modules/development-feature-assignment/development-feature-assignment.module';
import { DevelopmentImageModule } from './modules/development-image/development-image.module';
import { DevelopmentModule } from './modules/development/development.module';
import { DevelopmentTypologyFeatureAssignmentModule } from './modules/development-typology-feature-assignment/development-typology-feature-assignment.module';
import { DevelopmentTypologyModule } from './modules/development-typology/development-typology.module';
import { GeoModule } from './modules/geo/geo.module';
import { PlatformTenantModule } from './modules/platform-tenant/platform-tenant.module';
import { PublicDevelopmentModule } from './modules/public-development/public-development.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationModule,
    UserModule,
    PlatformTenantModule,
    StorageModule,
    PropertyModule,
    PropertyListingModule,
    PropertyPriceModule,
    PropertyImageModule,
    PropertyFeatureModule,
    PropertyFeatureAssignmentModule,
    PublicPropertyModule,
    DevelopmentModule,
    DevelopmentImageModule,
    DevelopmentFeatureAssignmentModule,
    DevelopmentTypologyModule,
    DevelopmentTypologyFeatureAssignmentModule,
    PublicDevelopmentModule,
    AdminDashboardModule,
    GeoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
