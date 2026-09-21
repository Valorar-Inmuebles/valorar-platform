jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalContractStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
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
jest.mock('../repositories/rental-reminder.repository', () => ({
  RentalReminderRepository: class RentalReminderRepository {},
}));

import { ReminderDeliveryRevalidationService } from './reminder-delivery-revalidation.service';

function occurrence(id: string, status = 'PENDING') {
  const contact = {
    id: 'contact-1',
    tenantId: 'tenant-1',
    isActive: true,
  };
  return {
    tenantId: 'tenant-1',
    dispatchId: 'dispatch-1',
    occurrenceId: id,
    status: 'INCLUDED',
    exclusionReason: null,
    evaluatedAt: new Date(),
    occurrence: {
      id,
      tenantId: 'tenant-1',
      status,
      dueDate: new Date('2026-10-10T00:00:00.000Z'),
      amount: { toString: () => '1000.00' },
      currency: 'ARS',
      obligation: {
        id: `obligation-${id}`,
        tenantId: 'tenant-1',
        isActive: true,
        includeInNotice: true,
        showAmount: true,
        concept: { id: `concept-${id}`, name: id },
        contract: {
          tenantId: 'tenant-1',
          status: 'ACTIVE',
          parties: [
            {
              id: 'party-1',
              tenantId: 'tenant-1',
              role: 'RENTER',
              contactId: 'contact-1',
              contact,
              notificationRoutes: [
                {
                  id: 'route-1',
                  tenantId: 'tenant-1',
                  channel: 'EMAIL',
                  contactPointId: 'point-1',
                  isEnabled: true,
                  contactPoint: {
                    id: 'point-1',
                    tenantId: 'tenant-1',
                    contactId: 'contact-1',
                    type: 'EMAIL',
                    value: 'renter@example.test',
                    isActive: true,
                    canReceiveWhatsapp: false,
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };
}

function delivery(
  occurrences = [occurrence('occ-1'), occurrence('occ-2')],
  attemptCount = 0,
  firstAttemptAt: Date | null = null,
) {
  return {
    id: 'delivery-1',
    tenantId: 'tenant-1',
    channel: 'EMAIL',
    routeId: 'route-1',
    contactPointId: 'point-1',
    attemptCount,
    dispatch: {
      id: 'dispatch-1',
      recipientContactId: 'contact-1',
      eventType: 'DUE',
      dueDate: new Date('2026-10-10T00:00:00.000Z'),
      policySnapshot: { timeZone: 'America/Argentina/Buenos_Aires' },
      firstAttemptAt,
      occurrences,
      deliveries: [],
    },
  };
}

describe('ReminderDeliveryRevalidationService', () => {
  const now = new Date('2026-10-10T13:00:00.000Z');

  it('removes a fulfilled subset before the first attempt', async () => {
    const repository = {
      findDeliveryForRevalidation: jest
        .fn()
        .mockResolvedValue(
          delivery([occurrence('occ-1'), occurrence('occ-2', 'FULFILLED')]),
        ),
      applyDeliveryRevalidation: jest.fn().mockResolvedValue({}),
    };
    const service = new ReminderDeliveryRevalidationService(
      repository as never,
    );
    const result = await service.revalidate('tenant-1', 'delivery-1', now);
    expect(result).toMatchObject({
      status: 'READY',
      includedOccurrenceIds: ['occ-1'],
      excludedOccurrenceIds: ['occ-2'],
    });
    expect(repository.applyDeliveryRevalidation).toHaveBeenCalledWith(
      expect.objectContaining({
        updateDispatchSnapshot: true,
        includedOccurrenceIds: ['occ-1'],
      }),
    );
  });

  it('skips delivery when fulfillment leaves no eligible occurrence', async () => {
    const repository = {
      findDeliveryForRevalidation: jest
        .fn()
        .mockResolvedValue(delivery([occurrence('occ-1', 'FULFILLED')])),
      applyDeliveryRevalidation: jest.fn().mockResolvedValue({}),
    };
    const service = new ReminderDeliveryRevalidationService(
      repository as never,
    );
    await expect(
      service.revalidate('tenant-1', 'delivery-1', now),
    ).resolves.toMatchObject({
      status: 'SKIPPED',
      reason: 'NO_LONGER_ELIGIBLE',
    });
  });

  it('does not rewrite a delivery snapshot after its first attempt', async () => {
    const repository = {
      findDeliveryForRevalidation: jest
        .fn()
        .mockResolvedValue(delivery([occurrence('occ-1')], 1, now)),
      applyDeliveryRevalidation: jest.fn(),
    };
    const service = new ReminderDeliveryRevalidationService(
      repository as never,
    );
    await expect(
      service.revalidate('tenant-1', 'delivery-1', now),
    ).resolves.toEqual({ status: 'IMMUTABLE', deliveryId: 'delivery-1' });
    expect(repository.applyDeliveryRevalidation).not.toHaveBeenCalled();
  });

  it('keeps dispatch snapshot frozen after another channel attempted', async () => {
    const repository = {
      findDeliveryForRevalidation: jest
        .fn()
        .mockResolvedValue(
          delivery(
            [occurrence('occ-1'), occurrence('occ-2', 'FULFILLED')],
            0,
            new Date('2026-10-10T12:59:00.000Z'),
          ),
        ),
      applyDeliveryRevalidation: jest.fn().mockResolvedValue({}),
    };
    const service = new ReminderDeliveryRevalidationService(
      repository as never,
    );
    await service.revalidate('tenant-1', 'delivery-1', now);
    expect(repository.applyDeliveryRevalidation).toHaveBeenCalledWith(
      expect.objectContaining({ updateDispatchSnapshot: false }),
    );
  });
});
