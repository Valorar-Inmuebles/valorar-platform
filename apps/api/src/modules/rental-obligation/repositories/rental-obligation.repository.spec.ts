jest.mock('../../../../generated/prisma/client', () => ({
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
  RentalFulfillmentStatus: { RECORDED: 'RECORDED', REVERSED: 'REVERSED' },
  RentalFulfillmentOrigin: { ADMIN: 'ADMIN' },
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
