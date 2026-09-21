import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
} from '../../../../generated/prisma/client';
import { nextRetryAt } from '../domain/rental-reminder-planner';
import {
  REMINDER_EMAIL_PROVIDER,
  type ReminderProviderAdapter,
} from '../ports/reminder-provider.port';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';
import {
  LogicalReminderOccurrence,
  RentalReminderEmailRenderer,
} from '../templates/rental-reminder-email.renderer';
import { ReminderDeliveryOrchestratorService } from './reminder-delivery-orchestrator.service';

type LogicalSnapshot = {
  eventType: string;
  dueDate: string;
  occurrences: LogicalReminderOccurrence[];
  text?: string;
};
type RecipientSnapshot = { name?: string };

@Injectable()
export class ReminderEmailProcessorService {
  constructor(
    private readonly repository: RentalReminderRepository,
    private readonly orchestrator: ReminderDeliveryOrchestratorService,
    private readonly renderer: RentalReminderEmailRenderer,
    @Inject(REMINDER_EMAIL_PROVIDER)
    private readonly provider: ReminderProviderAdapter,
  ) {}

  preview(tenantId: string, deliveryId: string) {
    return this.repository.findReadyEmailDelivery(tenantId, deliveryId);
  }

  async processOne(tenantId: string, deliveryId: string, now: Date) {
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
    if (!delivery || delivery.channel !== NotificationChannel.EMAIL) {
      await this.orchestrator.release({
        tenantId,
        deliveryId,
        leaseToken: claimed.leaseToken,
      });
      return { disposition: 'NOT_EMAIL' as const };
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
          })
        : {
            subject: delivery.subjectSnapshot ?? '',
            html: delivery.bodySnapshot,
            text: logical.text ?? '',
            contentSnapshot: delivery.contentSnapshot,
            templateKey: delivery.templateKey,
            templateVersion: delivery.templateVersion,
          };
    const attempt = await this.repository.createDeliveryAttempt({
      tenantId,
      deliveryId,
      token: claimed.leaseToken,
      startedAt: now,
      subject: rendered.subject,
      body: rendered.html,
      contentSnapshot: rendered.contentSnapshot as Prisma.InputJsonValue,
      templateKey: rendered.templateKey,
      templateVersion: rendered.templateVersion,
    });
    if (!attempt) return { disposition: 'CLAIM_LOST' as const };
    const started = Date.now();
    const result = await this.provider.send(
      {
        deliveryId,
        channel: NotificationChannel.EMAIL,
        destination: delivery.destinationSnapshot,
        subject: rendered.subject,
        body: rendered.html,
        textBody: rendered.text,
        templateKey: rendered.templateKey,
        templateVersion: rendered.templateVersion,
        providerTemplateRef: delivery.providerTemplateRef,
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
}
