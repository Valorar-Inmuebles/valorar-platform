import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyModule } from '../property/property.module';
import { PropertyImageController } from './controllers/property-image.controller';
import { PropertyImageRepository } from './repositories/property-image.repository';
import { PropertyImageService } from './services/property-image.service';

@Module({
  imports: [AuthModule, PropertyModule],
  controllers: [PropertyImageController],
  providers: [PropertyImageService, PropertyImageRepository],
  exports: [PropertyImageService, PropertyImageRepository],
})
export class PropertyImageModule {}
