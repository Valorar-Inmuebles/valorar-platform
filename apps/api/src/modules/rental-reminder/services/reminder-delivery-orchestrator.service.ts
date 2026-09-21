import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { nextRetryAt } from '../domain/rental-reminder-planner';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';
import { ReminderDeliveryRevalidationService } from './reminder-delivery-revalidation.service';

const DEFAULT_LEASE_MS = 2 * 60_000;

@Injectable()
export class ReminderDeliveryOrchestratorService {
  constructor(
    private readonly repository: RentalReminderRepository,
    private readonly revalidation: ReminderDeliveryRevalidationService,
  ) {}

  async claimNext(
    now: Date,
    options: { tenantId?: string; deliveryId?: string; leaseMs?: number } = {},
  ) {
    const token = randomUUID();
    const claimed = await this.repository.claimReadyDelivery({
      tenantId: options.tenantId,
      deliveryId: options.deliveryId,
      now,
      token,
      lockedUntil: new Date(
        now.getTime() + (options.leaseMs ?? DEFAULT_LEASE_MS),
      ),
    });
    if (!claimed) return null;

    const validation = await this.revalidation.revalidate(
      claimed.tenantId,
      claimed.id,
      now,
    );
    if (validation.status === 'SKIPPED') {
      return {
        disposition: 'SKIPPED' as const,
        deliveryId: claimed.id,
        reason: validation.reason,
      };
    }

    return {
      disposition: 'CLAIMED' as const,
      leaseToken: token,
      lockedUntil: claimed.lockedUntil,
      delivery: claimed,
      revalidation: validation,
    };
  }

  async release(input: {
    tenantId: string;
    deliveryId: string;
    leaseToken: string;
  }) {
    const result = await this.repository.releaseDeliveryClaim({
      tenantId: input.tenantId,
      deliveryId: input.deliveryId,
      token: input.leaseToken,
    });
    return result.count === 1;
  }

  async scheduleRetry(input: {
    tenantId: string;
    deliveryId: string;
    leaseToken: string;
    attemptNumber: number;
    failedAt: Date;
  }) {
    const scheduledFor = nextRetryAt(input.attemptNumber, input.failedAt);
    const result = await this.repository.persistRetrySchedule({
      tenantId: input.tenantId,
      deliveryId: input.deliveryId,
      token: input.leaseToken,
      attemptNumber: input.attemptNumber,
      nextAttemptAt: scheduledFor,
      failedAt: input.failedAt,
    });
    return { persisted: result.count === 1, nextAttemptAt: scheduledFor };
  }
}
