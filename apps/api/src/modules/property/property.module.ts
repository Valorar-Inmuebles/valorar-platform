import { Module } from '@nestjs/common';
import { PropertyController } from './controllers/property.controller';
import { PropertyRepository } from './repositories/property.repository';
import { PropertyService } from './services/property.service';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyService, PropertyRepository],
})
export class PropertyModule {}
