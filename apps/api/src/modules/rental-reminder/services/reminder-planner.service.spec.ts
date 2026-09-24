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

import { NotificationChannel } from '../../../../generated/prisma/client';
import { ReminderPlannerService } from './reminder-planner.service';

type PersistedPlan = {
  groupKey: string;
  occurrenceSetHash: string;
  contentSnapshot: { occurrences: unknown[] };
  deliveries: Array<{ channel: string }>;
};

const policy = {
  id: 'policy-1',
  tenantId: 'tenant-1',
  preDueEnabled: false,
  preDueDays: 3,
  dueEnabled: true,
  postDueEnabled: false,
  postDueDays: 3,
  sendTimeMinutes: 600,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenant: {
    settings: { timeZone: 'America/Argentina/Buenos_Aires' },
  },
};

function candidate(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tenantId: 'tenant-1',
    dueDate: new Date('2026-10-10T00:00:00.000Z'),
    amount: { toString: () => '1000.00' },
    currency: 'ARS',
    status: 'PENDING',
    obligation: {
      id: `obligation-${id}`,
      tenantId: 'tenant-1',
      showAmount: true,
      includeInNotice: true,
      isActive: true,
      concept: {
        id: `concept-${id}`,
        name: id === 'occ-1' ? 'Alquiler' : 'Expensas',
        slug: id,
        systemCode: null,
      },
      contract: {
        id: 'contract-1',
        tenantId: 'tenant-1',
        internalNumber: 'ALQ-000001',
        status: 'ACTIVE',
        parties: [
          {
            id: 'party-1',
            tenantId: 'tenant-1',
            role: 'RENTER',
            contactId: 'contact-1',
            contact: {
              id: 'contact-1',
              tenantId: 'tenant-1',
              name: 'María Núñez',
              isActive: true,
            },
            notificationRoutes: [
              {
                id: 'route-email',
                tenantId: 'tenant-1',
                channel: NotificationChannel.EMAIL,
                isEnabled: true,
                contactPointId: 'cp-email',
                contactPoint: {
                  id: 'cp-email',
                  tenantId: 'tenant-1',
                  contactId: 'contact-1',
                  type: 'EMAIL',
                  value: 'maria@example.test',
                  isActive: true,
                  canReceiveWhatsapp: false,
                },
              },
              {
                id: 'route-wa',
                tenantId: 'tenant-1',
                channel: NotificationChannel.WHATSAPP,
                isEnabled: true,
                contactPointId: 'cp-phone',
                contactPoint: {
                  id: 'cp-phone',
                  tenantId: 'tenant-1',
                  contactId: 'contact-1',
                  type: 'PHONE',
                  value: '+5491112345678',
                  isActive: true,
                  canReceiveWhatsapp: true,
                },
              },
              {
                id: 'route-sms',
                tenantId: 'tenant-1',
                channel: 'SMS',
                isEnabled: true,
                contactPointId: 'cp-phone',
                contactPoint: {
                  id: 'cp-phone',
                  tenantId: 'tenant-1',
                  contactId: 'contact-1',
                  type: 'PHONE',
                  value: '+5491112345678',
                  isActive: true,
                  canReceiveWhatsapp: true,
                },
              },
            ],
          },
        ],
      },
    },
    ...overrides,
  };
}

describe('ReminderPlannerService', () => {
  const now = new Date('2026-10-10T13:00:00.000Z');

  it('groups same-event occurrences and prepares independent Email/WhatsApp deliveries', async () => {
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest
        .fn()
        .mockResolvedValue([candidate('occ-2'), candidate('occ-1')]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: true, mutable: true }),
    };
    const service = new ReminderPlannerService(repository as never);

    const result = await service.run(now);

    expect(result.dispatchesCreated).toBe(1);
    expect(result.deliveriesPrepared).toBe(2);
    expect(result.plans[0]).toMatchObject({
      occurrenceIds: ['occ-1', 'occ-2'],
      channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    });
    const persistedCalls = repository.upsertPlannedDispatch.mock
      .calls as unknown as PersistedPlan[][];
    const persisted = persistedCalls[0][0];
    expect(persisted.occurrenceSetHash).toMatch(/^[0-9a-f]{64}$/);
    expect(persisted.contentSnapshot.occurrences).toHaveLength(2);
    expect(
      persisted.deliveries.map((item: { channel: string }) => item.channel),
    ).not.toContain('SMS');
  });

  it('runs for one tenant without invoking the global policy query', async () => {
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest.fn().mockResolvedValue([candidate('occ-1')]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: true, mutable: true }),
    };
    const service = new ReminderPlannerService(repository as never);

    await service.runForTenant('tenant-1', now, { dryRun: true });

    expect(repository.findPlannerPolicies).toHaveBeenCalledWith('tenant-1');
    expect(repository.reconcilePlanningIssues).not.toHaveBeenCalled();
    expect(repository.upsertPlannedDispatch).not.toHaveBeenCalled();
  });

  it('creates one logical dispatch per renter and keeps channels independent', async () => {
    const input = candidate('occ-1');
    const firstParty = input.obligation.contract.parties[0];
    input.obligation.contract.parties.push({
      ...firstParty,
      id: 'party-2',
      contactId: 'contact-2',
      contact: {
        ...firstParty.contact,
        id: 'contact-2',
        name: 'Ana Gómez',
      },
      notificationRoutes: firstParty.notificationRoutes.map((route) => ({
        ...route,
        id: `${route.id}-2`,
        contactPointId: `${route.contactPointId}-2`,
        contactPoint: {
          ...route.contactPoint,
          id: `${route.contactPoint.id}-2`,
          contactId: 'contact-2',
        },
      })),
    });
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest.fn().mockResolvedValue([input]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: true, mutable: true }),
    };
    const service = new ReminderPlannerService(repository as never);

    const result = await service.run(now);

    expect(result.plans).toHaveLength(2);
    expect(result.plans.map((plan) => plan.recipientContactId).sort()).toEqual([
      'contact-1',
      'contact-2',
    ]);
    expect(result.deliveriesPrepared).toBe(4);
  });

  it('is repeatable and converges on the same DB-protected group key', async () => {
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest.fn().mockResolvedValue([candidate('occ-1')]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: false, mutable: true }),
    };
    const service = new ReminderPlannerService(repository as never);
    await service.run(now);
    await service.run(now);
    const persistedCalls = repository.upsertPlannedDispatch.mock
      .calls as unknown as PersistedPlan[][];
    const first = persistedCalls[0][0];
    const second = persistedCalls[1][0];
    expect(first.groupKey).toBe(second.groupKey);
    expect(first.occurrenceSetHash).toBe(second.occurrenceSetHash);
  });

  it('allows a reversed occurrence to be reconsidered without duplicating its event', async () => {
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([candidate('occ-1')]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: false, mutable: false }),
    };
    const service = new ReminderPlannerService(repository as never);

    await service.run(now);
    const afterReversal = await service.run(now);

    expect(afterReversal.plans).toHaveLength(1);
    expect(repository.upsertPlannedDispatch).toHaveBeenCalledTimes(1);
    expect(afterReversal.dispatchesDeduplicated).toBe(1);
  });

  it('deduplicates missing due date/amount issues without creating deliveries', async () => {
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest
        .fn()
        .mockResolvedValue([
          candidate('missing-date', { dueDate: null }),
          candidate('missing-amount', { amount: null }),
        ]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest.fn(),
    };
    const service = new ReminderPlannerService(repository as never);
    const result = await service.run(now);
    type ReconcileArguments = [string, Array<{ deduplicationKey: string }>];
    const reconcileCalls = repository.reconcilePlanningIssues.mock
      .calls as unknown as ReconcileArguments[];
    const detections = reconcileCalls[0][1];
    expect(result.issuesDetected).toBe(2);
    expect(
      new Set(
        detections.map(
          (item: { deduplicationKey: string }) => item.deduplicationKey,
        ),
      ).size,
    ).toBe(2);
    expect(repository.upsertPlannedDispatch).not.toHaveBeenCalled();
  });

  it('allows a nullable amount when showAmount is disabled', async () => {
    const withoutVisibleAmount = candidate('occ-1', { amount: null });
    withoutVisibleAmount.obligation.showAmount = false;
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest
        .fn()
        .mockResolvedValue([withoutVisibleAmount]),
      reconcilePlanningIssues: jest.fn().mockResolvedValue(undefined),
      upsertPlannedDispatch: jest
        .fn()
        .mockResolvedValue({ created: true, mutable: true }),
    };
    const service = new ReminderPlannerService(repository as never);

    const result = await service.run(now);

    expect(result.plans).toHaveLength(1);
    expect(result.issuesDetected).toBe(0);
  });

  it('reports invalid ContactPoint/no valid route and keeps dry-run read-only', async () => {
    const invalid = candidate('occ-1');
    invalid.obligation.contract.parties[0].notificationRoutes[0].contactPoint.isActive = false;
    invalid.obligation.contract.parties[0].notificationRoutes[1].contactPoint.canReceiveWhatsapp = false;
    const repository = {
      findPlannerPolicies: jest.fn().mockResolvedValue([policy]),
      findPlanningCandidates: jest.fn().mockResolvedValue([invalid]),
      reconcilePlanningIssues: jest.fn(),
      upsertPlannedDispatch: jest.fn(),
    };
    const service = new ReminderPlannerService(repository as never);
    const result = await service.run(now, { dryRun: true });
    expect(result.issuesDetected).toBeGreaterThanOrEqual(2);
    expect(repository.reconcilePlanningIssues).not.toHaveBeenCalled();
    expect(repository.upsertPlannedDispatch).not.toHaveBeenCalled();
  });
});
