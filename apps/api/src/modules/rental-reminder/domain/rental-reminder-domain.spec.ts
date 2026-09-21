jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalReminderAttemptStatus: {
    PROCESSING: 'PROCESSING',
    ACCEPTED: 'ACCEPTED',
    FAILED: 'FAILED',
  },
  RentalReminderDeliveryStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
  RentalReminderDispatchStatus: {
    PLANNED: 'PLANNED',
    READY: 'READY',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
}));

import {
  NotificationChannel,
  RentalReminderAttemptStatus,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchStatus,
} from '../../../../generated/prisma/client';
import {
  canTransitionAttempt,
  canTransitionDelivery,
  canTransitionDispatch,
  computeAttemptKey,
  computeDeliveryKey,
  computeDispatchGroupKey,
  computeOccurrenceSetHash,
  computePlanningIssueKey,
  isOperationalReminderChannel,
} from './rental-reminder-domain';

describe('Rental reminder domain', () => {
  it('hashes occurrence sets deterministically regardless of order or duplicates', () => {
    expect(computeOccurrenceSetHash(['occ-2', 'occ-1', 'occ-1'])).toBe(
      computeOccurrenceSetHash(['occ-1', 'occ-2']),
    );
    expect(computeOccurrenceSetHash(['occ-1'])).toMatch(/^[0-9a-f]{64}$/);
  });

  it('builds stable scoped idempotency keys', () => {
    const dispatch = computeDispatchGroupKey({
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      recipientContactId: 'contact-1',
      eventType: 'DUE',
      dueDate: '2026-10-10',
    });
    const issue = computePlanningIssueKey({
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      occurrenceId: 'occ-1',
      type: 'DUE_DATE_MISSING',
    });
    expect(dispatch).toMatch(/^[0-9a-f]{64}$/);
    expect(issue).toMatch(/^[0-9a-f]{64}$/);
    expect(computeDeliveryKey(dispatch, NotificationChannel.EMAIL)).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(computeAttemptKey(dispatch, 1)).not.toBe(
      computeAttemptKey(dispatch, 2),
    );
  });

  it('keeps SMS non-operational in C1', () => {
    expect(isOperationalReminderChannel(NotificationChannel.EMAIL)).toBe(true);
    expect(isOperationalReminderChannel(NotificationChannel.WHATSAPP)).toBe(
      true,
    );
    expect(isOperationalReminderChannel(NotificationChannel.SMS)).toBe(false);
  });

  it('allows only canonical forward state transitions', () => {
    expect(
      canTransitionDispatch(
        RentalReminderDispatchStatus.PLANNED,
        RentalReminderDispatchStatus.READY,
      ),
    ).toBe(true);
    expect(
      canTransitionDispatch(
        RentalReminderDispatchStatus.COMPLETED,
        RentalReminderDispatchStatus.PROCESSING,
      ),
    ).toBe(false);
    expect(
      canTransitionDelivery(
        RentalReminderDeliveryStatus.PROCESSING,
        RentalReminderDeliveryStatus.PENDING,
      ),
    ).toBe(true);
    expect(
      canTransitionDelivery(
        RentalReminderDeliveryStatus.READ,
        RentalReminderDeliveryStatus.DELIVERED,
      ),
    ).toBe(false);
    expect(
      canTransitionAttempt(
        RentalReminderAttemptStatus.PROCESSING,
        RentalReminderAttemptStatus.ACCEPTED,
      ),
    ).toBe(true);
    expect(
      canTransitionAttempt(
        RentalReminderAttemptStatus.ACCEPTED,
        RentalReminderAttemptStatus.FAILED,
      ),
    ).toBe(false);
  });
});
