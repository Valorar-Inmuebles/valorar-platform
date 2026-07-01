import { Module } from '@nestjs/common';
import { GeoController } from './controllers/geo.controller';
import { GeoRepository } from './repositories/geo.repository';
import { GeoService } from './services/geo.service';

@Module({
  controllers: [GeoController],
  providers: [GeoService, GeoRepository],
  exports: [GeoService, GeoRepository],
})
export class GeoModule {}
