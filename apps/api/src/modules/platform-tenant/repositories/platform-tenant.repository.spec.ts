jest.mock('../../../../generated/prisma/client', () => ({
  TenantStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' },
  RentalConceptSystemCode: {
    RENT: 'RENT',
    EXPENSES: 'EXPENSES',
    ELECTRICITY: 'ELECTRICITY',
    GAS: 'GAS',
    ABL: 'ABL',
    AYSA: 'AYSA',
    INSURANCE: 'INSURANCE',
  },
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PlatformTenantRepository } from './platform-tenant.repository';

describe('PlatformTenantRepository rental defaults', () => {
  it('creates all seven base concepts with a new tenant', async () => {
    type CreateInput = {
      data: {
        rentalConcepts: { create: Array<{ systemCode: string }> };
      };
    };
    let captured: CreateInput | undefined;
    const create = jest.fn((input: CreateInput) => {
      captured = input;
      return Promise.resolve({ id: 'tenant-1' });
    });
    const prisma = {
      tenant: { create },
    };
    const repository = new PlatformTenantRepository(prisma as never);

    await repository.createTenant(
      { name: 'Demo', slug: 'demo' },
      { email: 'demo@example.com' },
    );

    const concepts = captured?.data.rentalConcepts.create ?? [];
    expect(create).toHaveBeenCalledTimes(1);
    expect(concepts).toHaveLength(7);
    expect(concepts.map((concept) => concept.systemCode)).toEqual(
      expect.arrayContaining(['RENT', 'INSURANCE']),
    );
  });
});
