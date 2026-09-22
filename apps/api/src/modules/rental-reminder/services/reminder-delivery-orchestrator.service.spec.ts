jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalReminderEventType: {
    PRE_DUE: 'PRE_DUE',
    DUE: 'DUE',
    POST_DUE: 'POST_DUE',
  },
  RentalReminderPlanningIssueType: {
    DUE_DATE_MISSING: 'DUE_DATE_MISSING',
    DISPLAY_AMOUNT_MISSING: 'DISPLAY_AMOUNT_MISSING',
    NO_ENABLED_ROUTE: 'NO_ENABLED_ROUTE',
    CONTACT_POINT_INELIGIBLE: 'CONTACT_POINT_INELIGIBLE',
    TENANT_TIME_ZONE_MISSING_OR_INVALID: 'TENANT_TIME_ZONE_MISSING_OR_INVALID',
    PLANNING_WINDOW_EXPIRED: 'PLANNING_WINDOW_EXPIRED',
  },
}));
jest.mock('../repositories/rental-reminder.repository', () => ({
  RentalReminderRepository: class RentalReminderRepository {},
}));
jest.mock('./reminder-delivery-revalidation.service', () => ({
  ReminderDeliveryRevalidationService: class ReminderDeliveryRevalidationService {},
}));

import { ReminderDeliveryOrchestratorService } from './reminder-delivery-orchestrator.service';

describe('ReminderDeliveryOrchestratorService', () => {
  const now = new Date('2026-10-10T13:00:00.000Z');

  it('claims with a lease, revalidates and never marks SENT', async () => {
    const repository = {
      claimReadyDelivery: jest.fn().mockResolvedValue({
        id: 'delivery-1',
        tenantId: 'tenant-1',
        lockedUntil: new Date('2026-10-10T13:02:00.000Z'),
        status: 'PROCESSING',
      }),
    };
    const revalidation = {
      revalidate: jest
        .fn()
        .mockResolvedValue({ status: 'READY', deliveryId: 'delivery-1' }),
    };
    const service = new ReminderDeliveryOrchestratorService(
      repository as never,
      revalidation as never,
    );
    const result = await service.claimNext(now, { tenantId: 'tenant-1' });
    expect(result).toMatchObject({ disposition: 'CLAIMED' });
    type ClaimInput = {
      tenantId: string;
      now: Date;
      token: string;
    };
    const claimCalls = repository.claimReadyDelivery.mock
      .calls as unknown as ClaimInput[][];
    const claimInput = claimCalls[0][0];
    expect(claimInput.tenantId).toBe('tenant-1');
    expect(claimInput.now).toBe(now);
    expect(claimInput.token).toEqual(expect.any(String));
    expect(revalidation.revalidate).toHaveBeenCalledWith(
      'tenant-1',
      'delivery-1',
      now,
    );
  });

  it('persists the canonical retry schedule without simulating provider success', async () => {
    const repository = {
      persistRetrySchedule: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const service = new ReminderDeliveryOrchestratorService(
      repository as never,
      {} as never,
    );
    const result = await service.scheduleRetry({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      leaseToken: 'lease-1',
      attemptNumber: 2,
      failedAt: now,
    });
    expect(result).toEqual({
      persisted: true,
      nextAttemptAt: new Date('2026-10-10T13:30:00.000Z'),
    });
    expect(repository.persistRetrySchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptNumber: 2,
        nextAttemptAt: new Date('2026-10-10T13:30:00.000Z'),
      }),
    );
  });

  it('delegates the manual retry reset to the repository', async () => {
    const repository = {
      manualResetFailedDelivery: jest.fn().mockResolvedValue({
        ok: true,
        attemptCount: 1,
        nextAttemptNumber: 2,
      }),
    };
    const service = new ReminderDeliveryOrchestratorService(
      repository as never,
      {} as never,
    );
    const result = await service.resetFailedDelivery({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      now,
    });
    expect(result).toEqual({ ok: true, attemptCount: 1, nextAttemptNumber: 2 });
    expect(repository.manualResetFailedDelivery).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      now,
    });
  });
});
