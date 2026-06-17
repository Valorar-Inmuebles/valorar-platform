import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageController } from './controllers/storage.controller';
import { S3CompatibleStorageService } from './services/s3-compatible-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [S3CompatibleStorageService],
  exports: [S3CompatibleStorageService],
})
export class StorageModule {}
