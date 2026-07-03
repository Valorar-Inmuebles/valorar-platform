import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevelopmentModule } from '../development/development.module';
import { StorageModule } from '../storage/storage.module';
import { DevelopmentImageController } from './controllers/development-image.controller';
import { DevelopmentImageRepository } from './repositories/development-image.repository';
import { DevelopmentImageService } from './services/development-image.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => DevelopmentModule),
    StorageModule,
  ],
  controllers: [DevelopmentImageController],
  providers: [DevelopmentImageService, DevelopmentImageRepository],
  exports: [DevelopmentImageService, DevelopmentImageRepository],
})
export class DevelopmentImageModule {}
