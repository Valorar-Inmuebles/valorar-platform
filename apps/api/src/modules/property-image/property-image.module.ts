import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyModule } from '../property/property.module';
import { StorageModule } from '../storage/storage.module';
import { PropertyImageController } from './controllers/property-image.controller';
import { PropertyImageRepository } from './repositories/property-image.repository';
import { PropertyImageService } from './services/property-image.service';

@Module({
  imports: [AuthModule, forwardRef(() => PropertyModule), StorageModule],
  controllers: [PropertyImageController],
  providers: [PropertyImageService, PropertyImageRepository],
  exports: [PropertyImageService, PropertyImageRepository],
})
export class PropertyImageModule {}
