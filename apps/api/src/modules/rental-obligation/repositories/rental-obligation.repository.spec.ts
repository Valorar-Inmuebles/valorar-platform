/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../../../../generated/prisma/client', () => ({
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
  RentalFulfillmentStatus: { RECORDED: 'RECORDED', REVERSED: 'REVERSED' },
  RentalFulfillmentOrigin: { ADMIN: 'ADMIN' },
  RentalContractEventType: { RENT_VALUE_REVISED: 'RENT_VALUE_REVISED' },
  Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { RentalOccurrenceStatus } from '../../../../generated/prisma/client';
import {
  RentalFulfillmentConflictError,
  RentalObligationRepository,
} from './rental-obligation.repository';

describe('RentalObligationRepository fulfillment transactions', () => {
  it('orders next attention by known due date with pending dates last', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new RentalObligationRepository({
      rentalObligationOccurrence: { findFirst },
    } as never);

    await repository.findNextAttentionOccurrence('tenant-1', 'contract-1');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: 'PENDING',
          obligation: { isActive: true, contractId: 'contract-1' },
        },
        orderBy: [
          { dueDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'asc' },
        ],
      }),
    );
  });

  it('records a revision and only recalculates future PENDING occurrences', async () => {
    const revision = {
      id: 'revision-2',
      amount: 150000,
      currency: 'ARS',
      effectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
    };
    const tx = {
      rentalRentValueRevision: {
        create: jest.fn().mockResolvedValue(revision),
        findFirstOrThrow: jest.fn().mockResolvedValue(revision),
      },
      rentalObligation: {
        findFirstOrThrow: jest
          .fn()
          .mockResolvedValue({ contractId: 'contract-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rentalContractEvent: { create: jest.fn().mockResolvedValue({}) },
      $executeRaw: jest.fn().mockResolvedValue(2),
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalObligationRepository(prisma as never);

    await repository.createRentValueRevision('obligation-1', 'tenant-1', {
      effectiveFrom: revision.effectiveFrom,
      amount: 150000,
      currency: 'ARS',
      recordedById: 'user-1',
      reason: null,
    });

    const rawCalls = tx.$executeRaw.mock.calls as unknown as Array<
      [TemplateStringsArray, ...unknown[]]
    >;
    const sql = rawCalls[0]?.[0].join(' ') ?? '';
    expect(sql).toContain("occurrence.status = 'PENDING'");
    expect(sql).toContain('occurrence."periodStartsOn" >=');
    expect(sql).toContain('ORDER BY candidate."effectiveFrom" DESC');
    expect(tx.rentalObligation.updateMany).toHaveBeenCalledWith({
      where: { id: 'obligation-1', tenantId: 'tenant-1' },
      data: { defaultAmount: 150000 },
    });
    expect(tx.rentalContractEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        contractId: 'contract-1',
        type: 'RENT_VALUE_REVISED',
        actorId: 'user-1',
      }),
    });
  });

  const occurrence = {
    id: 'occurrence-1',
    tenantId: 'tenant-1',
    amount: 100,
  } as never;

  it('claims PENDING before creating a fulfillment', async () => {
    const tx = {
      rentalObligationOccurrence: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'occurrence-1' }),
      },
      rentalFulfillment: {
        create: jest.fn().mockResolvedValue({ id: 'fulfillment-1' }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalObligationRepository(prisma as never);

    await repository.recordFulfillment(occurrence, {
      fulfilledOn: new Date('2026-09-09T00:00:00.000Z'),
      amount: 100,
      notes: null,
      recordedById: 'user-1',
    });

    expect(tx.rentalObligationOccurrence.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally untyped at this assertion boundary.
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          status: RentalOccurrenceStatus.PENDING,
        }),
      }),
    );
    expect(tx.rentalFulfillment.create).toHaveBeenCalledTimes(1);
  });

  it('prevents a second current fulfillment when the atomic claim loses', async () => {
    const tx = {
      rentalObligationOccurrence: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      rentalFulfillment: { create: jest.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalObligationRepository(prisma as never);

    await expect(
      repository.recordFulfillment(occurrence, {
        fulfilledOn: new Date('2026-09-09T00:00:00.000Z'),
        amount: 100,
        notes: null,
        recordedById: 'user-1',
      }),
    ).rejects.toBeInstanceOf(RentalFulfillmentConflictError);
    expect(tx.rentalFulfillment.create).not.toHaveBeenCalled();
  });

  it('uses the database unique key safely when materialization is repeated', async () => {
    const prisma = {
      rentalObligationOccurrence: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new RentalObligationRepository(prisma as never);
    const seed = {
      periodKey: '2026-09',
      periodStartsOn: new Date('2026-09-01T00:00:00.000Z'),
      periodEndsOn: new Date('2026-09-30T00:00:00.000Z'),
      dueDate: new Date('2026-09-10T00:00:00.000Z'),
      amount: 100,
      currency: 'ARS' as const,
      status: 'PENDING' as const,
    };

    await repository.createMissingOccurrences('obligation-1', 'tenant-1', [
      seed,
    ]);

    expect(prisma.rentalObligationOccurrence.createMany).toHaveBeenCalledWith({
      data: [{ ...seed, obligationId: 'obligation-1', tenantId: 'tenant-1' }],
      skipDuplicates: true,
    });
  });
});
