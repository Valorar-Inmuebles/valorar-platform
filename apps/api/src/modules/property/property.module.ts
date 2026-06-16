import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyController } from './controllers/property.controller';
import { PropertyRepository } from './repositories/property.repository';
import { PropertyService } from './services/property.service';

@Module({
  imports: [AuthModule],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyService, PropertyRepository],
})
export class PropertyModule {}
