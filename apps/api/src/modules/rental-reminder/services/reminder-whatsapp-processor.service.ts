import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
} from '../../../../generated/prisma/client';
import { nextRetryAt } from '../domain/rental-reminder-planner';
import {
  REMINDER_WHATSAPP_PROVIDER,
  type ReminderProviderAdapter,
  type ReminderProviderTemplate,
} from '../ports/reminder-provider.port';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';
import {
  type MetaWhatsAppTemplateSelection,
  RentalReminderWhatsAppRenderer,
} from '../templates/rental-reminder-whatsapp.renderer';
import type { LogicalReminderOccurrence } from '../templates/rental-reminder-email.renderer';
import { ReminderDeliveryOrchestratorService } from './reminder-delivery-orchestrator.service';

type LogicalSnapshot = {
  eventType: string;
  dueDate: string;
  occurrences: LogicalReminderOccurrence[];
  text?: string;
  providerTemplate?: ReminderProviderTemplate & { parameterMode?: string };
};
type RecipientSnapshot = { name?: string };

@Injectable()
export class ReminderWhatsAppProcessorService {
  constructor(
    private readonly repository: RentalReminderRepository,
    private readonly orchestrator: ReminderDeliveryOrchestratorService,
    private readonly renderer: RentalReminderWhatsAppRenderer,
    @Inject(REMINDER_WHATSAPP_PROVIDER)
    private readonly provider: ReminderProviderAdapter,
  ) {}

  async preview(
    tenantId: string,
    deliveryId: string,
    template: MetaWhatsAppTemplateSelection,
  ) {
    const delivery = await this.repository.findReadyWhatsAppDelivery(
      tenantId,
      deliveryId,
    );
    if (!delivery) return null;
    const logical = delivery.contentSnapshot as LogicalSnapshot;
    const recipient = delivery.dispatch.recipientSnapshot as RecipientSnapshot;
    const rendered = this.renderer.render({
      recipientName: recipient.name ?? '',
      contractNumber: delivery.dispatch.contract.internalNumber,
      eventType: logical.eventType,
      dueDate: logical.dueDate,
      occurrences: logical.occurrences,
      template,
    });
    return { delivery, rendered };
  }

  async processOne(
    tenantId: string,
    deliveryId: string,
    now: Date,
    template: MetaWhatsAppTemplateSelection,
  ) {
    const claimed = await this.orchestrator.claimNext(now, {
      tenantId,
      deliveryId,
    });
    if (!claimed || claimed.disposition !== 'CLAIMED') return claimed;
    const delivery = await this.repository.findClaimedDelivery({
      tenantId,
      deliveryId,
      token: claimed.leaseToken,
    });
    if (!delivery || delivery.channel !== NotificationChannel.WHATSAPP) {
      await this.orchestrator.release({
        tenantId,
        deliveryId,
        leaseToken: claimed.leaseToken,
      });
      return { disposition: 'NOT_WHATSAPP' as const };
    }
    const logical = delivery.contentSnapshot as LogicalSnapshot;
    const recipient = delivery.dispatch.recipientSnapshot as RecipientSnapshot;
    const rendered =
      delivery.attemptCount === 0
        ? this.renderer.render({
            recipientName: recipient.name ?? '',
            contractNumber: delivery.dispatch.contract.internalNumber,
            eventType: logical.eventType,
            dueDate: logical.dueDate,
            occurrences: logical.occurrences,
            template,
          })
        : this.frozenRender(delivery, logical);
    const attempt = await this.repository.createDeliveryAttempt({
      tenantId,
      deliveryId,
      token: claimed.leaseToken,
      startedAt: now,
      subject: '',
      body: rendered.body,
      contentSnapshot: rendered.contentSnapshot as Prisma.InputJsonValue,
      templateKey: rendered.templateKey,
      templateVersion: rendered.templateVersion,
      providerTemplateRef: rendered.providerTemplateRef,
    });
    if (!attempt) return { disposition: 'CLAIM_LOST' as const };
    const started = Date.now();
    const result = await this.provider.send(
      {
        deliveryId,
        channel: NotificationChannel.WHATSAPP,
        destination: delivery.destinationSnapshot,
        subject: null,
        body: rendered.body,
        textBody: rendered.text,
        templateKey: rendered.templateKey,
        templateVersion: rendered.templateVersion,
        providerTemplateRef: rendered.providerTemplateRef,
        providerTemplate: rendered.providerTemplate,
      },
      delivery.deliveryKey,
    );
    const finishedAt = new Date();
    const latencyMs = Math.max(0, Date.now() - started);
    if (result.accepted) {
      await this.repository.acceptDeliveryAttempt({
        tenantId,
        deliveryId,
        attemptId: attempt.id,
        token: claimed.leaseToken,
        providerMessageId: result.providerMessageId,
        finishedAt,
        latencyMs,
      });
      return {
        disposition: 'ACCEPTED' as const,
        deliveryId,
        providerMessageId: result.providerMessageId,
      };
    }
    const canonicalRetry = result.retryable
      ? nextRetryAt(attempt.attemptNumber, finishedAt)
      : null;
    const providerRetry = result.retryAfterMs
      ? new Date(
          finishedAt.getTime() + Math.min(result.retryAfterMs, 86_400_000),
        )
      : null;
    const retryAt =
      canonicalRetry && providerRetry && providerRetry > canonicalRetry
        ? providerRetry
        : canonicalRetry;
    await this.repository.failDeliveryAttempt({
      tenantId,
      deliveryId,
      attemptId: attempt.id,
      token: claimed.leaseToken,
      finishedAt,
      latencyMs,
      retryAt,
      errorCategory: result.errorCategory,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
    return {
      disposition: retryAt ? ('RETRY_SCHEDULED' as const) : ('FAILED' as const),
      deliveryId,
      retryAt,
      errorCategory: result.errorCategory,
    };
  }

  private frozenRender(
    delivery: {
      bodySnapshot: string;
      contentSnapshot: Prisma.JsonValue;
      templateKey: string;
      templateVersion: string;
      providerTemplateRef: string | null;
    },
    logical: LogicalSnapshot,
  ) {
    const providerTemplate = logical.providerTemplate;
    if (!providerTemplate)
      throw new Error('Frozen WhatsApp delivery has no provider template.');
    return {
      body: delivery.bodySnapshot,
      text: logical.text ?? delivery.bodySnapshot,
      contentSnapshot: delivery.contentSnapshot,
      templateKey: delivery.templateKey,
      templateVersion: delivery.templateVersion,
      providerTemplateRef:
        delivery.providerTemplateRef ?? providerTemplate.reference,
      providerTemplate: {
        reference: providerTemplate.reference,
        languageCode: providerTemplate.languageCode,
        parameters: providerTemplate.parameters,
      },
    };
  }
}
