jest.mock('../../../../generated/prisma/client', () => ({
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { RentalContractStatus } from '../../../../generated/prisma/client';
import { RentalContractRepository } from './rental-contract.repository';

describe('RentalContractRepository terminal transition', () => {
  it('activates atomically only when an active RENT obligation exists', async () => {
    const prisma = {
      rentalContract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'contract-1',
          status: RentalContractStatus.ACTIVE,
        }),
      },
    };
    const repository = new RentalContractRepository(prisma as never);

    await repository.activateWithRentRequirement('contract-1', 'tenant-1');

    expect(prisma.rentalContract.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'contract-1',
        tenantId: 'tenant-1',
        status: RentalContractStatus.DRAFT,
        parties: {
          some: { role: 'RENTER', contact: { isActive: true } },
        },
        obligations: {
          some: { isActive: true, concept: { systemCode: 'RENT' } },
        },
      },
      data: { status: RentalContractStatus.ACTIVE },
    });
  });

  it('deactivates obligations and cancels only future pending occurrences', async () => {
    const returned = { id: 'contract-1', status: RentalContractStatus.ENDED };
    const tx = {
      rentalContract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(returned),
      },
      rentalObligation: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      rentalObligationOccurrence: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);
    const localToday = new Date('2026-09-09T00:00:00.000Z');

    await repository.transitionToTerminal(
      'contract-1',
      'tenant-1',
      RentalContractStatus.ENDED,
      localToday,
      'manager-1',
    );

    expect(tx.rentalObligation.updateMany).toHaveBeenCalledWith({
      where: { contractId: 'contract-1', tenantId: 'tenant-1', isActive: true },
      data: { isActive: false },
    });
    expect(tx.rentalObligationOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        status: 'PENDING',
        dueDate: { gt: localToday },
        obligation: { contractId: 'contract-1' },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({
        status: 'CANCELLED',
        cancelledById: 'manager-1',
      }),
    });
  });
});
