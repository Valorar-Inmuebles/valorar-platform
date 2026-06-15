import { Module } from '@nestjs/common';
import { PublicPropertyController } from './controllers/public-property.controller';
import { PublicPropertyRepository } from './repositories/public-property.repository';
import { PublicPropertyService } from './services/public-property.service';

@Module({
  controllers: [PublicPropertyController],
  providers: [PublicPropertyService, PublicPropertyRepository],
  exports: [PublicPropertyService, PublicPropertyRepository],
})
export class PublicPropertyModule {}
