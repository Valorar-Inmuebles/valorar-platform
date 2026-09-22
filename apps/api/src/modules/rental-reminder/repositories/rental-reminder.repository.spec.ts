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

  it('does not degrade READ with a late DELIVERED webhook', async () => {
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'READ',
          attempts: [{ id: 'attempt-1' }],
        }),
        update: jest.fn(),
      },
      rentalReminderWebhookReceipt: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new RentalReminderRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);
    await expect(
      repository.applyProviderWebhook({
        providerKey: 'meta-whatsapp',
        providerAccountKey: 'platform-default',
        providerEventKey: 'event-1',
        providerMessageId: 'wamid.1',
        eventType: 'delivered',
        providerOccurredAt: new Date('2026-10-10T13:00:00.000Z'),
        payloadDigest: 'a'.repeat(64),
        targetStatus: 'DELIVERED',
        processedAt: new Date('2026-10-10T13:01:00.000Z'),
      }),
    ).resolves.toEqual({ status: 'IGNORED' });
    expect(tx.rentalReminderDelivery.update).not.toHaveBeenCalled();
  });

  it('ignores a late FAILED webhook after DELIVERED', async () => {
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'DELIVERED',
          attempts: [{ id: 'attempt-1' }],
        }),
        update: jest.fn(),
      },
      rentalReminderWebhookReceipt: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new RentalReminderRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);
    await expect(
      repository.applyProviderWebhook({
        providerKey: 'meta-whatsapp',
        providerAccountKey: 'platform-default',
        providerEventKey: 'event-2',
        providerMessageId: 'wamid.1',
        eventType: 'failed',
        providerOccurredAt: new Date('2026-10-10T13:00:00.000Z'),
        payloadDigest: 'b'.repeat(64),
        targetStatus: 'FAILED',
        errorCategory: 'RECIPIENT_REJECTED',
        errorCode: 'META_131026',
        errorMessage: 'Terminal failure.',
        processedAt: new Date('2026-10-10T13:01:00.000Z'),
      }),
    ).resolves.toEqual({ status: 'IGNORED' });
    expect(tx.rentalReminderDelivery.update).not.toHaveBeenCalled();
  });

  it('deduplicates provider events before changing delivery state', async () => {
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'SENT',
          attempts: [{ id: 'attempt-1' }],
        }),
        update: jest.fn(),
      },
      rentalReminderWebhookReceipt: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repository = new RentalReminderRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);
    await expect(
      repository.applyProviderWebhook({
        providerKey: 'meta-whatsapp',
        providerAccountKey: 'platform-default',
        providerEventKey: 'event-3',
        providerMessageId: 'wamid.1',
        eventType: 'delivered',
        providerOccurredAt: null,
        payloadDigest: 'c'.repeat(64),
        targetStatus: 'DELIVERED',
        processedAt: new Date('2026-10-10T13:01:00.000Z'),
      }),
    ).resolves.toEqual({ status: 'DUPLICATE' });
    expect(tx.rentalReminderDelivery.update).not.toHaveBeenCalled();
  });
});

describe('RentalReminderRepository manual reset for retry', () => {
  const now = new Date('2026-09-22T05:35:00.000Z');
  const past = new Date('2026-09-22T05:00:00.000Z');
  const future = new Date('2026-09-22T06:00:00.000Z');

  function repositoryWith(tx: unknown) {
    return new RentalReminderRepository({
      $transaction: (callback: (client: unknown) => unknown) =>
        callback(tx),
    } as never);
  }

  it('resets a FAILED tenant delivery to PENDING and reopens a terminal dispatch', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const dispatchUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'FAILED',
          attemptCount: 1,
          lockedUntil: null,
          errorCategory: 'AUTHENTICATION',
          errorCode: 'META_190',
          errorMessage: 'Meta WhatsApp authentication or authorization failed.',
        }),
        updateMany,
      },
      rentalReminderDispatch: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'dispatch-1', completedAt: past }),
        updateMany: dispatchUpdateMany,
      },
    };
    const repository = repositoryWith(tx);

    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      attemptCount: 1,
      nextAttemptNumber: 2,
      dispatchReopened: true,
    });

    expect(tx.rentalReminderDelivery.findFirst).toHaveBeenCalledWith({
      where: { id: 'delivery-1', tenantId: 'tenant-1' },
      select: expect.objectContaining({
        status: true,
        attemptCount: true,
        lockedUntil: true,
      }) as unknown,
    });
    const data = updateMany.mock.calls[0][0].data;
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      id: 'delivery-1',
      tenantId: 'tenant-1',
      OR: [
        { status: 'FAILED' },
        { status: 'PROCESSING', lockedUntil: { lt: now } },
      ],
    });
    expect(data).toEqual({
      status: 'PENDING',
      statusSource: 'INTERNAL',
      nextAttemptAt: now,
      failedAt: null,
      processingToken: null,
      lockedUntil: null,
    });
    // Error history is preserved on the delivery until the next attempt writes it.
    expect(data).not.toHaveProperty('errorCategory');
    expect(data).not.toHaveProperty('errorCode');
    expect(data).not.toHaveProperty('errorMessage');
    expect(dispatchUpdateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        id: 'dispatch-1',
        completedAt: { not: null },
      },
      data: { status: 'READY', completedAt: null },
    });
  });

  it('leaf dispatch untouched when the group is already non-terminal', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const dispatchUpdateMany = jest.fn();
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'FAILED',
          attemptCount: 1,
          lockedUntil: null,
        }),
        updateMany,
      },
      rentalReminderDispatch: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'dispatch-1', completedAt: null }),
        updateMany: dispatchUpdateMany,
      },
    };
    const repository = repositoryWith(tx);

    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      attemptCount: 1,
      nextAttemptNumber: 2,
      dispatchReopened: false,
    });
    expect(dispatchUpdateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['SENT', null],
    ['DELIVERED', null],
    ['READ', null],
    ['PENDING', null],
    ['SKIPPED', null],
    ['PROCESSING', future],
  ])(
    'refuses to reset a delivery with status %s (never SENT/DELIVERED/READ retried)',
    async (status, lockedUntil) => {
      const updateMany = jest.fn();
      const tx = {
        rentalReminderDelivery: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'delivery-1',
            tenantId: 'tenant-1',
            dispatchId: 'dispatch-1',
            status,
            attemptCount: 1,
            lockedUntil,
          }),
          updateMany,
        },
      };
      const repository = repositoryWith(tx);
      await expect(
        repository.manualResetFailedDelivery({
          tenantId: 'tenant-1',
          deliveryId: 'delivery-1',
          now,
        }),
      ).resolves.toEqual({ ok: false, reason: 'NOT_FAILED' });
      expect(updateMany).not.toHaveBeenCalled();
    },
  );

  it('recovers a dangling PROCESSING delivery (expired lease, no live attempt) and reopens the dispatch', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const dispatchUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'PROCESSING',
          attemptCount: 1,
          lockedUntil: past,
        }),
        updateMany,
      },
      rentalReminderDeliveryAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      rentalReminderDispatch: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'dispatch-1', completedAt: past }),
        updateMany: dispatchUpdateMany,
      },
    };
    const repository = repositoryWith(tx);

    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({
      ok: true,
      attemptCount: 1,
      nextAttemptNumber: 2,
      dispatchReopened: true,
    });
    expect(tx.rentalReminderDeliveryAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        status: 'PROCESSING',
      },
      select: { id: true },
    });
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      OR: [
        { status: 'FAILED' },
        { status: 'PROCESSING', lockedUntil: { lt: now } },
      ],
    });
    expect(updateMany.mock.calls[0][0].data).toMatchObject({
      status: 'PENDING',
      processingToken: null,
      lockedUntil: null,
    });
    expect(dispatchUpdateMany).toHaveBeenCalled();
  });

  it('refuses IN_FLIGHT recovery when a live PROCESSING attempt exists', async () => {
    const updateMany = jest.fn();
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'PROCESSING',
          attemptCount: 1,
          lockedUntil: past,
        }),
        updateMany,
      },
      rentalReminderDeliveryAttempt: {
        findFirst: jest.fn().mockResolvedValue({ id: 'attempt-live' }),
      },
    };
    const repository = repositoryWith(tx);
    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({ ok: false, reason: 'IN_FLIGHT' });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not leak a delivery across tenants (NOT_FOUND)', async () => {
    const updateMany = jest.fn();
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany,
      },
    };
    const repository = repositoryWith(tx);
    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-2',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect(tx.rentalReminderDelivery.findFirst).toHaveBeenCalledWith({
      where: { id: 'delivery-1', tenantId: 'tenant-2' },
      select: expect.anything(),
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('respects the canonical four-attempt ceiling', async () => {
    const updateMany = jest.fn();
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'FAILED',
          attemptCount: 4,
          lockedUntil: null,
        }),
        updateMany,
      },
    };
    const repository = repositoryWith(tx);
    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({ ok: false, reason: 'MAX_ATTEMPTS' });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('fails closed when a concurrent reset wins (compare-and-set)', async () => {
    const tx = {
      rentalReminderDelivery: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'delivery-1',
          tenantId: 'tenant-1',
          dispatchId: 'dispatch-1',
          status: 'FAILED',
          attemptCount: 1,
          lockedUntil: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      rentalReminderDispatch: { findFirst: jest.fn() },
    };
    const repository = repositoryWith(tx);
    await expect(
      repository.manualResetFailedDelivery({
        tenantId: 'tenant-1',
        deliveryId: 'delivery-1',
        now,
      }),
    ).resolves.toEqual({ ok: false, reason: 'CONCURRENT' });
    expect(tx.rentalReminderDispatch.findFirst).not.toHaveBeenCalled();
  });
});
