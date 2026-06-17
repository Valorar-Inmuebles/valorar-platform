import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyFeatureController } from './controllers/property-feature.controller';
import { PropertyFeatureRepository } from './repositories/property-feature.repository';
import { PropertyFeatureService } from './services/property-feature.service';

@Module({
  imports: [AuthModule],
  controllers: [PropertyFeatureController],
  providers: [PropertyFeatureService, PropertyFeatureRepository],
  exports: [PropertyFeatureService, PropertyFeatureRepository],
})
export class PropertyFeatureModule {}
