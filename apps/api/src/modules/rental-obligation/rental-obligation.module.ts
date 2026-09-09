import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  RentalFulfillmentController,
  RentalObligationController,
  RentalOccurrenceController,
} from './controllers/rental-obligation.controller';
import { RentalObligationRepository } from './repositories/rental-obligation.repository';
import { RentalObligationService } from './services/rental-obligation.service';

@Module({
  imports: [AuthModule],
  controllers: [
    RentalObligationController,
    RentalOccurrenceController,
    RentalFulfillmentController,
  ],
  providers: [RentalObligationService, RentalObligationRepository],
})
export class RentalObligationModule {}
