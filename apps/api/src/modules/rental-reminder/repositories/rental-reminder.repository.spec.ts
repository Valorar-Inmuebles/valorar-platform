jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalContractStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
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
  RentalReminderAttemptStatus: {
    PROCESSING: 'PROCESSING',
    ACCEPTED: 'ACCEPTED',
    FAILED: 'FAILED',
  },
  RentalReminderStatusSource: {
    INTERNAL: 'INTERNAL',
    PROVIDER_RESPONSE: 'PROVIDER_RESPONSE',
    PROVIDER_WEBHOOK: 'PROVIDER_WEBHOOK',
  },
  RentalReminderWebhookReceiptStatus: {
    APPLIED: 'APPLIED',
    IGNORED: 'IGNORED',
  },
  RentalReminderDispatchOccurrenceStatus: {
    INCLUDED: 'INCLUDED',
    EXCLUDED_BEFORE_SEND: 'EXCLUDED_BEFORE_SEND',
  },
  RentalReminderDispatchStatus: {
    PLANNED: 'PLANNED',
    READY: 'READY',
    PROCESSING: 'PROCESSING',
  },
  RentalReminderPlanningIssueStatus: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
  TenantStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { RentalReminderRepository } from './rental-reminder.repository';

describe('RentalReminderRepository tenant isolation', () => {
  it('scopes planning issues and pagination to the current tenant', async () => {
    const findMany = jest.fn().mockReturnValue(Promise.resolve([]));
    const count = jest.fn().mockReturnValue(Promise.resolve(0));
    const prisma = {
      rentalReminderPlanningIssue: { findMany, count },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new RentalReminderRepository(prisma as never);

    await repository.findPlanningIssues('tenant-1', {
      page: 2,
      pageSize: 10,
      contractId: 'contract-1',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', contractId: 'contract-1' },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', contractId: 'contract-1' },
    });
  });

  it('does not expose attempts when the delivery belongs to another tenant', async () => {
    const findMany = jest.fn();
    const prisma = {
      rentalReminderDelivery: { count: jest.fn().mockResolvedValue(0) },
      rentalReminderDeliveryAttempt: { findMany, count: jest.fn() },
    };
    const repository = new RentalReminderRepository(prisma as never);

    await expect(
      repository.findAttempts('tenant-1', 'foreign-delivery'),
    ).resolves.toBeNull();
    expect(prisma.rentalReminderDelivery.count).toHaveBeenCalledWith({
      where: { id: 'foreign-delivery', tenantId: 'tenant-1' },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('updates the policy inside a tenant-scoped transaction', async () => {
    const policy = { id: 'policy-1' };
    const tx = {
      rentalReminderPolicy: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(policy),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalReminderRepository(prisma as never);
    const data = {
      preDueEnabled: true,
      preDueDays: 4,
      dueEnabled: true,
      postDueEnabled: false,
      postDueDays: 2,
      sendTimeMinutes: 540,
    };

    await expect(repository.updatePolicy('tenant-1', data)).resolves.toBe(
      policy,
    );
    expect(tx.rentalReminderPolicy.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data,
    });
  });

  it('loads only pending active tenant occurrences for planning', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      rentalObligationOccurrence: { findMany },
    };
    const repository = new RentalReminderRepository(prisma as never);
    const dueFrom = new Date('2026-09-01T00:00:00.000Z');
    const dueTo = new Date('2026-11-01T00:00:00.000Z');

    await repository.findPlanningCandidates('tenant-1', dueFrom, dueTo);

    type PlanningInput = {
      where: {
        tenantId: string;
        status: string;
        obligation: {
          tenantId: string;
          isActive: boolean;
          includeInNotice: boolean;
          contract: { tenantId: string; status: string };
        };
      };
    };
    const planningCalls = findMany.mock.calls as unknown as PlanningInput[][];
    const planningInput = planningCalls[0][0];
    expect(planningInput.where).toMatchObject({
      tenantId: 'tenant-1',
      status: 'PENDING',
      obligation: {
        tenantId: 'tenant-1',
        isActive: true,
        includeInNotice: true,
        contract: { tenantId: 'tenant-1', status: 'ACTIVE' },
      },
    });
  });

  it('claims a delivery with compare-and-set so concurrent workers cannot both win', async () => {
    const candidate = {
      id: 'delivery-1',
      tenantId: 'tenant-1',
      dispatchId: 'dispatch-1',
    };
    const prisma = {
      $transaction: jest.fn().mockResolvedValue(false),
      rentalReminderDelivery: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(candidate)
          .mockResolvedValueOnce({ ...candidate, processingToken: 'token-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rentalReminderDispatch: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new RentalReminderRepository(prisma as never);
    const now = new Date('2026-10-10T13:00:00.000Z');

    await expect(
      repository.claimReadyDelivery({
        tenantId: 'tenant-1',
        now,
        token: 'token-1',
        lockedUntil: new Date('2026-10-10T13:02:00.000Z'),
      }),
    ).resolves.toMatchObject({ id: 'delivery-1' });
    type ClaimInput = {
      where: {
        id: string;
        tenantId: string;
        OR: Array<{ status: string }>;
      };
      data: { status: string; processingToken: string };
    };
    const claimCalls = prisma.rentalReminderDelivery.updateMany.mock
      .calls as unknown as ClaimInput[][];
    const claimInput = claimCalls[0][0];
    expect(claimInput).toMatchObject({
      where: {
        id: 'delivery-1',
        tenantId: 'tenant-1',
      },
      data: {
        status: 'PROCESSING',
        processingToken: 'token-1',
      },
    });
    expect(claimInput.where.OR[0]).toMatchObject({ status: 'PENDING' });
  });

  it('closes an expired processing attempt before reclaiming its delivery', async () => {
    const candidate = {
      id: 'delivery-1',
      tenantId: 'tenant-1',
      dispatchId: 'dispatch-1',
    };
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          ...candidate,
          attemptCount: 1,
          attempts: [{ id: 'attempt-1' }],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      rentalReminderDeliveryAttempt: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
      rentalReminderDelivery: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(candidate)
          .mockResolvedValueOnce({ ...candidate, processingToken: 'token-2' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rentalReminderDispatch: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new RentalReminderRepository(prisma as never);
    const now = new Date('2026-10-10T13:00:00.000Z');

    await repository.claimReadyDelivery({
      tenantId: 'tenant-1',
      now,
      token: 'token-2',
      lockedUntil: new Date('2026-10-10T13:02:00.000Z'),
    });

    expect(tx.rentalReminderDeliveryAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'attempt-1',
          tenantId: 'tenant-1',
          status: 'PROCESSING',
        }) as unknown,
        data: expect.objectContaining({
          status: 'FAILED',
          errorCategory: 'LEASE_EXPIRED',
        }) as unknown,
      }),
    );
    expect(tx.rentalReminderDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: 'PENDING',
          nextAttemptAt: now,
          processingToken: null,
        }) as unknown,
      }),
    );
  });

  it('upserts detected issues and resolves managed issues no longer present', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      rentalReminderPlanningIssue: { upsert, updateMany },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalReminderRepository(prisma as never);
    const detectedAt = new Date('2026-10-10T13:00:00.000Z');

    await repository.reconcilePlanningIssues(
      'tenant-1',
      [
        {
          contractId: 'contract-1',
          occurrenceId: 'occ-1',
          type: 'DUE_DATE_MISSING',
          deduplicationKey: 'issue-key',
        },
      ],
      ['DUE_DATE_MISSING'],
      detectedAt,
    );

    expect(upsert).toHaveBeenCalledTimes(1);
    const resolveCalls = updateMany.mock.calls as unknown as Array<
      Array<{
        where: { deduplicationKey: { notIn: string[] } };
        data: { status: string; resolvedAt: Date };
      }>
    >;
    expect(resolveCalls[0][0]).toMatchObject({
      where: { deduplicationKey: { notIn: ['issue-key'] } },
      data: { status: 'RESOLVED', resolvedAt: detectedAt },
    });
  });
});
