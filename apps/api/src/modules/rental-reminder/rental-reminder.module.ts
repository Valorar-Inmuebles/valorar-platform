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
import { MailerSendAdapter } from './providers/mailersend.adapter';
import { ReminderEmailProcessorService } from './services/reminder-email-processor.service';
import { RentalReminderEmailRenderer } from './templates/rental-reminder-email.renderer';
import { MailerSendWebhookController } from './controllers/mailersend-webhook.controller';
import { MailerSendWebhookService } from './services/mailersend-webhook.service';
import { REMINDER_EMAIL_PROVIDER } from './ports/reminder-provider.port';
import { REMINDER_WHATSAPP_PROVIDER } from './ports/reminder-provider.port';
import { MetaWhatsAppAdapter } from './providers/meta-whatsapp.adapter';
import { ReminderWhatsAppProcessorService } from './services/reminder-whatsapp-processor.service';
import { RentalReminderWhatsAppRenderer } from './templates/rental-reminder-whatsapp.renderer';
import { MetaWhatsAppWebhookController } from './controllers/meta-whatsapp-webhook.controller';
import { MetaWhatsAppWebhookService } from './services/meta-whatsapp-webhook.service';
import { CommunicationInboundRepository } from './repositories/communication-inbound.repository';
import { CommunicationInboundService } from './services/communication-inbound.service';

@Module({
  imports: [AuthModule],
  controllers: [
    RentalReminderPolicyController,
    RentalReminderCommunicationController,
    MailerSendWebhookController,
    MetaWhatsAppWebhookController,
  ],
  providers: [
    RentalReminderService,
    RentalReminderRepository,
    ReminderPlannerService,
    ReminderDeliveryRevalidationService,
    ReminderDeliveryOrchestratorService,
    ReminderEmailProcessorService,
    RentalReminderEmailRenderer,
    MailerSendAdapter,
    { provide: REMINDER_EMAIL_PROVIDER, useExisting: MailerSendAdapter },
    MailerSendWebhookService,
    MetaWhatsAppAdapter,
    { provide: REMINDER_WHATSAPP_PROVIDER, useExisting: MetaWhatsAppAdapter },
    ReminderWhatsAppProcessorService,
    RentalReminderWhatsAppRenderer,
    MetaWhatsAppWebhookService,
    CommunicationInboundRepository,
    CommunicationInboundService,
  ],
  exports: [
    ReminderPlannerService,
    ReminderDeliveryRevalidationService,
    ReminderDeliveryOrchestratorService,
    ReminderEmailProcessorService,
    ReminderWhatsAppProcessorService,
    CommunicationInboundService,
  ],
})
export class RentalReminderModule {}
