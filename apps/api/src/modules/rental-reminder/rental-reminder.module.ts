import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  RentalReminderCommunicationController,
  RentalReminderPolicyController,
} from './controllers/rental-reminder.controller';
import { RentalReminderRepository } from './repositories/rental-reminder.repository';
import { RentalReminderService } from './services/rental-reminder.service';

@Module({
  imports: [AuthModule],
  controllers: [
    RentalReminderPolicyController,
    RentalReminderCommunicationController,
  ],
  providers: [RentalReminderService, RentalReminderRepository],
})
export class RentalReminderModule {}
