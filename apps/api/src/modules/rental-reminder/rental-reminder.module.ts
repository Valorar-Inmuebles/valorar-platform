import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  RentalReminderCommunicationController,
  RentalReminderPolicyController,
} from './controllers/rental-reminder.controller';
import { RentalReminderRepository } from './repositories/rental-reminder.repository';
import { RentalReminderService } from './services/rental-reminder.service';
import { ReminderDeliveryOrchestratorService } from './services/reminder-delivery-orchestrator.service';
import { ReminderDeliveryRevalidationService } from './services/reminder-delivery-revalidation.service';
import { ReminderPlannerService } from './services/reminder-planner.service';

@Module({
  imports: [AuthModule],
  controllers: [
    RentalReminderPolicyController,
    RentalReminderCommunicationController,
  ],
  providers: [
    RentalReminderService,
    RentalReminderRepository,
    ReminderPlannerService,
    ReminderDeliveryRevalidationService,
    ReminderDeliveryOrchestratorService,
  ],
  exports: [
    ReminderPlannerService,
    ReminderDeliveryRevalidationService,
    ReminderDeliveryOrchestratorService,
  ],
})
export class RentalReminderModule {}
