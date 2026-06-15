import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PublicPropertyModule } from './modules/public-property/public-property.module';
import { PropertyImageModule } from './modules/property-image/property-image.module';
import { PropertyListingModule } from './modules/property-listing/property-listing.module';
import { PropertyModule } from './modules/property/property.module';
import { PropertyPriceModule } from './modules/property-price/property-price.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PropertyModule,
    PropertyListingModule,
    PropertyPriceModule,
    PropertyImageModule,
    PublicPropertyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
