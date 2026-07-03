import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeoModule } from '../geo/geo.module';
import { DevelopmentController } from './controllers/development.controller';
import { DevelopmentRepository } from './repositories/development.repository';
import { DevelopmentGeoService } from './services/development-geo.service';
import { DevelopmentService } from './services/development.service';

@Module({
  imports: [AuthModule, GeoModule],
  controllers: [DevelopmentController],
  providers: [
    DevelopmentService,
    DevelopmentGeoService,
    DevelopmentRepository,
  ],
  exports: [DevelopmentService, DevelopmentRepository],
})
export class DevelopmentModule {}
