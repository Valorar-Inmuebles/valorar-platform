jest.mock('../../../../generated/prisma/client', () => ({
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { RentalContractStatus } from '../../../../generated/prisma/client';
import { RentalContractRepository } from './rental-contract.repository';

describe('RentalContractRepository terminal transition', () => {
  it('allocates unique tenant-scoped numbers under concurrent creates', async () => {
    const counters = new Map<string, number>();
    const createdNumbers: Array<{ tenantId: string; internalNumber: string }> =
      [];
    let contractIndex = 0;
    const tx = {
      rentalContractSequence: {
        upsert: jest
          .fn()
          .mockImplementation(
            async ({
              where: { tenantId },
            }: {
              where: { tenantId: string };
            }) => {
              await Promise.resolve();
              const lastValue = (counters.get(tenantId) ?? 0) + 1;
              counters.set(tenantId, lastValue);
              return { tenantId, lastValue };
            },
          ),
      },
      rentalContract: {
        create: jest
          .fn()
          .mockImplementation(
            ({
              data,
            }: {
              data: { tenantId: string; internalNumber: string };
            }) => {
              createdNumbers.push({
                tenantId: data.tenantId,
                internalNumber: data.internalNumber,
              });
              contractIndex += 1;
              return {
                id: `contract-${contractIndex}`,
                tenantId: data.tenantId,
              };
            },
          ),
        findUniqueOrThrow: jest
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) => ({
            id: where.id,
          })),
      },
      rentalContractParty: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);
    const data = (tenantId: string) =>
      ({
        tenantId,
        propertyAddressSnapshot: 'Calle 1',
        startsOn: new Date('2026-01-01T00:00:00.000Z'),
        status: RentalContractStatus.DRAFT,
      }) as never;

    await Promise.all([
      ...Array.from({ length: 8 }, () =>
        repository.create(data('tenant-1'), []),
      ),
      repository.create(data('tenant-2'), []),
    ]);

    const tenantOneNumbers = createdNumbers
      .filter((item) => item.tenantId === 'tenant-1')
      .map((item) => item.internalNumber);
    expect(new Set(tenantOneNumbers).size).toBe(8);
    expect(tenantOneNumbers.sort()).toEqual(
      Array.from(
        { length: 8 },
        (_, index) => `ALQ-${String(index + 1).padStart(6, '0')}`,
      ),
    );
    expect(createdNumbers).toContainEqual({
      tenantId: 'tenant-2',
      internalNumber: 'ALQ-000001',
    });
  });

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
          some: {
            role: 'RENTER',
            isPrimary: true,
            contact: { isActive: true },
          },
        },
        endsOn: { not: null },
        obligations: {
          some: { isActive: true, concept: { systemCode: 'RENT' } },
        },
      },
      data: { status: RentalContractStatus.ACTIVE },
    });
  });

  it('preserves party and route IDs when compatible data is unchanged', async () => {
    const tx = {
      rentalContract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'contract-1' }),
      },
      rentalContractParty: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'party-1',
            role: 'RENTER',
            contactId: 'contact-1',
            isPrimary: true,
            notificationRoutes: [
              {
                id: 'route-1',
                channel: 'EMAIL',
                contactPointId: 'email-1',
                isEnabled: true,
              },
            ],
          },
        ]),
        deleteMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({ id: 'party-1' }),
        create: jest.fn(),
      },
      rentalContractNotificationRoute: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);

    await repository.update('contract-1', 'tenant-1', {}, [
      {
        contactId: 'contact-1',
        role: 'RENTER',
        isPrimary: true,
        notificationRoutes: [
          { channel: 'EMAIL', contactPointId: 'email-1', isEnabled: true },
        ],
      },
    ]);

    expect(tx.rentalContractParty.create).not.toHaveBeenCalled();
    expect(tx.rentalContractParty.deleteMany).not.toHaveBeenCalled();
    expect(tx.rentalContractNotificationRoute.update).not.toHaveBeenCalled();
    expect(tx.rentalContractNotificationRoute.create).not.toHaveBeenCalled();
    expect(
      tx.rentalContractNotificationRoute.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it('removes only the party omitted from an update', async () => {
    const tx = {
      rentalContract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'contract-1' }),
      },
      rentalContractParty: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'party-1',
            role: 'RENTER',
            contactId: 'contact-1',
            isPrimary: true,
            notificationRoutes: [],
          },
          {
            id: 'party-2',
            role: 'LANDLORD',
            contactId: 'contact-2',
            isPrimary: false,
            notificationRoutes: [],
          },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue({ id: 'party-1' }),
        create: jest.fn(),
      },
      rentalContractNotificationRoute: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);

    await repository.update('contract-1', 'tenant-1', {}, [
      {
        contactId: 'contact-1',
        role: 'RENTER',
        isPrimary: true,
      },
    ]);

    expect(tx.rentalContractParty.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['party-2'] },
        contractId: 'contract-1',
        tenantId: 'tenant-1',
      },
    });
  });

  it('creates a renewal with new identities and only active recurring obligations and compatible routes', async () => {
    const source = {
      id: 'contract-1',
      tenantId: 'tenant-1',
      status: RentalContractStatus.ACTIVE,
      propertyId: 'property-1',
      propertyCountryId: null,
      propertyProvinceId: null,
      propertyLocalityId: null,
      propertyNeighborhoodId: null,
      propertyAddressSnapshot: 'Calle 1',
      propertyCountrySnapshot: 'Argentina',
      propertyProvinceSnapshot: 'Buenos Aires',
      propertyLocalitySnapshot: 'La Plata',
      propertyNeighborhoodSnapshot: null,
      propertyStreetSnapshot: 'Calle',
      propertyStreetNumberSnapshot: '1',
      propertyFloorSnapshot: null,
      propertyUnitSnapshot: null,
      propertyPostalCodeSnapshot: null,
      propertyNotesSnapshot: null,
      startsOn: new Date('2026-01-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
      parties: [
        {
          id: 'party-old',
          contactId: 'contact-1',
          role: 'RENTER',
          isPrimary: true,
          contact: { contactPoints: [] },
          notificationRoutes: [
            {
              channel: 'EMAIL',
              contactPointId: 'email-1',
              isEnabled: true,
              contactPoint: {
                contactId: 'contact-1',
                type: 'EMAIL',
                isActive: true,
                canReceiveSms: false,
                canReceiveWhatsapp: false,
              },
            },
            {
              channel: 'SMS',
              contactPointId: 'phone-inactive',
              isEnabled: true,
              contactPoint: {
                contactId: 'contact-1',
                type: 'PHONE',
                isActive: false,
                canReceiveSms: true,
                canReceiveWhatsapp: false,
              },
            },
          ],
        },
      ],
      obligations: [
        {
          conceptId: 'rent-concept',
          kind: 'RECURRING',
          recurrenceMonths: 1,
          dueDay: 10,
          amountMode: 'FIXED',
          defaultAmount: 1000,
          currency: 'ARS',
        },
      ],
    };
    const created = { id: 'contract-2', tenantId: 'tenant-1' };
    const returned = {
      ...created,
      internalNumber: 'ALQ-000002',
      previousContract: {
        id: 'contract-1',
        internalNumber: 'ALQ-000001',
        status: RentalContractStatus.ACTIVE,
      },
    };
    const tx = {
      rentalContract: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(created),
        findUniqueOrThrow: jest.fn().mockResolvedValue(returned),
      },
      rentalContractSequence: {
        upsert: jest.fn().mockResolvedValue({ lastValue: 2 }),
      },
      rentalContractParty: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'party-new' }),
      },
      rentalContractNotificationRoute: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'route-new' }),
      },
      rentalObligation: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);

    const result = await repository.renew('contract-1', 'tenant-1', 'user-1');

    expect(result).toEqual({ outcome: 'CREATED', contract: returned });
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(tx.rentalContract.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'contract-1', tenantId: 'tenant-1' },
        include: expect.objectContaining({
          obligations: {
            where: { isActive: true, kind: 'RECURRING' },
          },
        }),
      }),
    );
    expect(tx.rentalContract.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        internalNumber: 'ALQ-000002',
        previousContractId: 'contract-1',
        status: 'DRAFT',
        endsOn: null,
        startsOn: new Date('2027-01-01T00:00:00.000Z'),
      }),
    });
    expect(tx.rentalObligation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          contractId: 'contract-2',
          kind: 'RECURRING',
          startsOn: new Date('2027-01-01T00:00:00.000Z'),
          endsOn: null,
        }),
      ],
    });
    expect(tx.rentalContractNotificationRoute.create).toHaveBeenCalledTimes(1);
    expect(tx.rentalContractNotificationRoute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contactPointId: 'email-1',
        contractPartyId: 'party-new',
      }),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('does not allocate another number when a successor already exists', async () => {
    const existing = { id: 'contract-2', internalNumber: 'ALQ-000002' };
    const tx = {
      rentalContract: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'contract-1',
            tenantId: 'tenant-1',
            status: RentalContractStatus.ENDED,
            parties: [],
            obligations: [],
          })
          .mockResolvedValueOnce(existing),
      },
      rentalContractSequence: { upsert: jest.fn() },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    };
    const repository = new RentalContractRepository(prisma as never);

    await expect(
      repository.renew('contract-1', 'tenant-1', 'user-1'),
    ).resolves.toEqual({ outcome: 'ALREADY_RENEWED', contract: existing });
    expect(tx.rentalContractSequence.upsert).not.toHaveBeenCalled();
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
