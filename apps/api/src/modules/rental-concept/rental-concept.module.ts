import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RentalConceptController } from './controllers/rental-concept.controller';
import { RentalConceptRepository } from './repositories/rental-concept.repository';
import { RentalConceptService } from './services/rental-concept.service';

@Module({
  imports: [AuthModule],
  controllers: [RentalConceptController],
  providers: [RentalConceptService, RentalConceptRepository],
  exports: [RentalConceptService, RentalConceptRepository],
})
export class RentalConceptModule {}
