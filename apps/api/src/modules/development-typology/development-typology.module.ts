import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevelopmentModule } from '../development/development.module';
import { DevelopmentTypologyController } from './controllers/development-typology.controller';
import { DevelopmentTypologyRepository } from './repositories/development-typology.repository';
import { DevelopmentTypologyService } from './services/development-typology.service';

@Module({
  imports: [AuthModule, DevelopmentModule],
  controllers: [DevelopmentTypologyController],
  providers: [DevelopmentTypologyService, DevelopmentTypologyRepository],
  exports: [DevelopmentTypologyService, DevelopmentTypologyRepository],
})
export class DevelopmentTypologyModule {}
