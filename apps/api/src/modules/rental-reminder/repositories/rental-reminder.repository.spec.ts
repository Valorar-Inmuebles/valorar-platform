jest.mock('../../../../generated/prisma/client', () => ({ Prisma: {} }));
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
});
