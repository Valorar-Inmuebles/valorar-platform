/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, options?: { code?: string }) {
        super(message);
        this.code = options?.code ?? message;
      }
    },
  },
}));

jest.mock('../repositories/rental-contract.repository', () => ({
  RentalContractRepository: class RentalContractRepository {},
}));

import {
  Prisma,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import { RentalContractRepository } from '../repositories/rental-contract.repository';
import { RentalContractService } from './rental-contract.service';

const now = new Date('2026-09-09T00:00:00.000Z');

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    internalNumber: 'ALQ-000001',
    tenantId: 'tenant-1',
    propertyId: null,
    property: null,
    parties: [],
    previousContract: null,
    renewedContract: null,
    createdById: 'user-1',
    propertyAddressSnapshot: 'Av. Rivadavia 1234',
    propertyCountryId: null,
    propertyProvinceId: null,
    propertyLocalityId: null,
    propertyNeighborhoodId: null,
    propertyCountrySnapshot: 'Argentina',
    propertyProvinceSnapshot: 'Buenos Aires',
    propertyLocalitySnapshot: null,
    propertyNeighborhoodSnapshot: null,
    propertyStreetSnapshot: 'Av. Rivadavia',
    propertyStreetNumberSnapshot: '1234',
    propertyFloorSnapshot: null,
    propertyUnitSnapshot: null,
    propertyPostalCodeSnapshot: null,
    propertyNotesSnapshot: null,
    startsOn: new Date('2026-09-01T00:00:00.000Z'),
    endsOn: null,
    status: RentalContractStatus.DRAFT,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('RentalContractService', () => {
  let service: RentalContractService;
  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    propertyBelongsToTenant: jest.fn(),
    contactsByIds: jest.fn(),
    hasActiveRentObligation: jest.fn(),
    activateWithRentRequirement: jest.fn(),
    tenantTimeZone: jest.fn(),
    transitionToTerminal: jest.fn(),
    renew: jest.fn(),
    findRenewalByPrevious: jest.fn(),
    findContractEvents: jest.fn(),
    findFulfillmentHistory: jest.fn(),
    findGeneralById: jest.fn(),
    dashboard: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RentalContractService,
        { provide: RentalContractRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(RentalContractService);
    repository.contactsByIds.mockResolvedValue([]);
    repository.tenantTimeZone.mockResolvedValue(
      'America/Argentina/Buenos_Aires',
    );
  });

  it('creates contracts as DRAFT', async () => {
    repository.create.mockResolvedValue(contract());
    const result = await service.create('tenant-1', 'user-1', {
      propertyStreetSnapshot: 'Av. Rivadavia',
      propertyStreetNumberSnapshot: '1234',
      startsOn: '2026-09-01',
    });
    expect(result.status).toBe(RentalContractStatus.DRAFT);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', status: 'DRAFT' }),
      [],
    );
  });

  it('returns a server-side paginated contract list', async () => {
    repository.findMany.mockResolvedValue([
      [contract({ obligations: [] })],
      21,
    ]);
    await expect(
      service.findAll('tenant-1', {
        search: 'Ana',
        endingBefore: '2026-12-31',
        sortBy: 'internalNumber',
        sortOrder: 'asc',
        page: 2,
        pageSize: 10,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
        total: 21,
        totalPages: 3,
      }),
    );
    expect(repository.findMany).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        search: 'Ana',
        endingBefore: new Date('2026-12-31T00:00:00.000Z'),
        sortBy: 'internalNumber',
        sortOrder: 'asc',
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it('projects the next known due occurrence without an extra per-contract query', async () => {
    repository.findMany.mockResolvedValue([
      [
        contract({
          obligations: [
            {
              concept: { id: 'rent', name: 'Alquiler', systemCode: 'RENT' },
              occurrences: [
                {
                  id: 'pending-date',
                  dueDate: null,
                  amount: null,
                  currency: 'ARS',
                },
              ],
            },
            {
              concept: { id: 'abl', name: 'ABL', systemCode: 'ABL' },
              occurrences: [
                {
                  id: 'known-date',
                  dueDate: new Date('2026-09-12T00:00:00.000Z'),
                  amount: { toString: () => '12500' },
                  currency: 'ARS',
                },
              ],
            },
          ],
        }),
      ],
      1,
    ]);

    const result = await service.findAll('tenant-1', {});

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        nextDueOccurrence: expect.objectContaining({
          id: 'known-date',
          amount: 12500,
          dueDatePending: false,
          concept: expect.objectContaining({ name: 'ABL' }),
        }),
      }),
    );
    expect(result.items[0]).not.toHaveProperty('obligations');
    expect(repository.findMany).toHaveBeenCalledTimes(1);
  });

  it('derives expiring-soon as an ACTIVE local-date window', async () => {
    repository.findMany.mockResolvedValue([[], 0]);
    await service.findAll('tenant-1', {
      endingWithinDays: 30,
      page: 1,
      pageSize: 20,
    });
    const options = repository.findMany.mock.calls[0][1];
    expect(options.status).toBe(RentalContractStatus.ACTIVE);
    expect(options.endingFrom).toBeInstanceOf(Date);
    expect(options.endingBefore.getTime() - options.endingFrom.getTime()).toBe(
      30 * 86_400_000,
    );
  });

  it('rejects ambiguous ending filters', async () => {
    await expect(
      service.findAll('tenant-1', {
        endingBefore: '2026-12-31',
        endingWithinDays: 30,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('unifies contract and fulfillment history in descending order', async () => {
    repository.findById.mockResolvedValue(contract());
    repository.findContractEvents.mockResolvedValue([
      [
        {
          id: 'event-1',
          type: 'ACTIVATED',
          occurredAt: new Date('2026-09-02T00:00:00.000Z'),
          actor: null,
          metadata: null,
        },
      ],
      1,
    ]);
    repository.findFulfillmentHistory.mockResolvedValue([
      [
        {
          id: 'fulfillment-1',
          createdAt: new Date('2026-09-03T00:00:00.000Z'),
          reversedAt: null,
          recordedBy: { id: 'user-1', name: 'Manager' },
          reversedBy: null,
          amount: 100,
          notes: null,
          reversalReason: null,
          occurrence: {
            id: 'occurrence-1',
            periodKey: '2026-09',
            dueDate: new Date('2026-09-10T00:00:00.000Z'),
            obligation: { concept: { id: 'concept-1', name: 'Alquiler' } },
          },
        },
      ],
      1,
      [],
      0,
    ]);

    const result = await service.history('contract-1', 'tenant-1', {
      page: 1,
      pageSize: 20,
    });
    expect(result.items.map((item) => item.type)).toEqual([
      'FULFILLMENT_RECORDED',
      'ACTIVATED',
    ]);
    expect(repository.findContractEvents).toHaveBeenCalledWith(
      'tenant-1',
      'contract-1',
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('keeps reversals in their own date-ordered history stream', async () => {
    repository.findById.mockResolvedValue(contract());
    repository.findContractEvents.mockResolvedValue([[], 0]);
    repository.findFulfillmentHistory.mockResolvedValue([
      [],
      0,
      [
        {
          id: 'fulfillment-1',
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          reversedAt: new Date('2026-09-04T00:00:00.000Z'),
          recordedBy: { id: 'user-1', name: 'Manager' },
          reversedBy: { id: 'user-2', name: 'Supervisor' },
          amount: 100,
          notes: null,
          reversalReason: 'Corrección',
          occurrence: {
            id: 'occurrence-1',
            periodKey: '2026-08',
            dueDate: new Date('2026-08-10T00:00:00.000Z'),
            obligation: { concept: { id: 'concept-1', name: 'Alquiler' } },
          },
        },
      ],
      1,
    ]);

    const result = await service.history('contract-1', 'tenant-1', {
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(result.items).toEqual([
      expect.objectContaining({ type: 'FULFILLMENT_REVERSED' }),
    ]);
  });

  it('returns a consolidated General read model without fabricated activity', async () => {
    repository.findGeneralById.mockResolvedValue({
      ...contract(),
      obligations: [],
    });

    await expect(service.general('contract-1', 'tenant-1')).resolves.toEqual(
      expect.objectContaining({
        currentRent: null,
        nextDueOccurrence: null,
        upcomingOccurrences: [],
        communicationActivity: null,
      }),
    );
  });

  it('returns operational dashboard metrics and no communication fiction', async () => {
    repository.dashboard.mockResolvedValue([
      [{ status: 'ACTIVE', _count: { _all: 2 } }],
      1,
      5,
      2,
      7,
      [],
    ]);

    await expect(service.dashboard('tenant-1')).resolves.toEqual(
      expect.objectContaining({
        contracts: expect.objectContaining({ ACTIVE: 2 }),
        attention: {
          endingSoon: 1,
          pendingOccurrences: 5,
          overdueOccurrences: 2,
          fulfilledOccurrences: 7,
        },
        communications: { available: false, sent: null },
      }),
    );
  });

  it('rejects a cross-tenant property reference', async () => {
    repository.propertyBelongsToTenant.mockResolvedValue(false);
    await expect(
      service.create('tenant-1', 'user-1', {
        propertyStreetSnapshot: 'Av. Rivadavia',
        startsOn: '2026-09-01',
        propertyId: 'property-other',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('accepts multiple parties and rejects contacts outside the tenant', async () => {
    const parties = [
      { contactId: 'renter-1', role: 'RENTER' as const },
      { contactId: 'renter-2', role: 'RENTER' as const },
      { contactId: 'landlord-1', role: 'LANDLORD' as const },
    ];
    repository.contactsByIds.mockResolvedValue([
      { id: 'renter-1', contactPoints: [] },
    ]);
    await expect(
      service.create('tenant-1', 'user-1', {
        propertyStreetSnapshot: 'Av. Rivadavia',
        startsOn: '2026-09-01',
        parties,
      }),
    ).rejects.toThrow(BadRequestException);
    repository.contactsByIds.mockResolvedValue(
      parties.map(({ contactId }) => ({ id: contactId, contactPoints: [] })),
    );
    repository.create.mockResolvedValue(contract({ parties }));
    await service.create('tenant-1', 'user-1', {
      propertyStreetSnapshot: 'Av. Rivadavia',
      startsOn: '2026-09-01',
      parties,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ propertyStreetSnapshot: 'Av. Rivadavia' }),
      parties,
    );
  });

  it('validates that contract routes use a compatible point owned by that person', async () => {
    repository.contactsByIds.mockResolvedValue([
      {
        id: 'renter-1',
        contactPoints: [
          {
            id: 'email-1',
            type: 'EMAIL',
            isActive: true,
            canReceiveWhatsapp: false,
            canReceiveSms: false,
          },
        ],
      },
    ]);
    await expect(
      service.create('tenant-1', 'user-1', {
        propertyStreetSnapshot: 'Av. Rivadavia',
        startsOn: '2026-09-01',
        parties: [
          {
            contactId: 'renter-1',
            role: 'RENTER',
            notificationRoutes: [
              { channel: 'WHATSAPP', contactPointId: 'email-1' },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('persists several channels with one compatible point per channel', async () => {
    const contact = {
      id: 'renter-1',
      contactPoints: [
        {
          id: 'email-1',
          type: 'EMAIL',
          isActive: true,
          canReceiveWhatsapp: false,
          canReceiveSms: false,
        },
        {
          id: 'phone-1',
          type: 'PHONE',
          isActive: true,
          canReceiveWhatsapp: true,
          canReceiveSms: true,
        },
      ],
    };
    const parties = [
      {
        contactId: contact.id,
        role: 'RENTER' as const,
        notificationRoutes: [
          { channel: 'EMAIL' as const, contactPointId: 'email-1' },
          { channel: 'WHATSAPP' as const, contactPointId: 'phone-1' },
          { channel: 'SMS' as const, contactPointId: 'phone-1' },
        ],
      },
    ];
    repository.contactsByIds.mockResolvedValue([contact]);
    repository.create.mockResolvedValue(contract());
    await service.create('tenant-1', 'user-1', {
      propertyStreetSnapshot: 'Av. Rivadavia',
      startsOn: '2026-09-01',
      parties,
    });
    expect(repository.create).toHaveBeenCalledWith(expect.any(Object), parties);
  });

  it('allows the same contact to select different points in different contracts', async () => {
    const contact = {
      id: 'renter-1',
      contactPoints: [
        {
          id: 'email-1',
          type: 'EMAIL',
          isActive: true,
          canReceiveWhatsapp: false,
          canReceiveSms: false,
        },
        {
          id: 'email-2',
          type: 'EMAIL',
          isActive: true,
          canReceiveWhatsapp: false,
          canReceiveSms: false,
        },
      ],
    };
    repository.contactsByIds.mockResolvedValue([contact]);
    repository.create.mockResolvedValue(contract());
    for (const contactPointId of ['email-1', 'email-2']) {
      await service.create('tenant-1', 'user-1', {
        propertyStreetSnapshot: 'Av. Rivadavia',
        startsOn: '2026-09-01',
        parties: [
          {
            contactId: contact.id,
            role: 'RENTER',
            notificationRoutes: [{ channel: 'EMAIL', contactPointId }],
          },
        ],
      });
    }
    expect(repository.create).toHaveBeenNthCalledWith(1, expect.any(Object), [
      expect.objectContaining({
        notificationRoutes: [
          expect.objectContaining({ contactPointId: 'email-1' }),
        ],
      }),
    ]);
    expect(repository.create).toHaveBeenNthCalledWith(2, expect.any(Object), [
      expect.objectContaining({
        notificationRoutes: [
          expect.objectContaining({ contactPointId: 'email-2' }),
        ],
      }),
    ]);
  });

  it('keeps the contractual address independent from the selected property', async () => {
    repository.propertyBelongsToTenant.mockResolvedValue(true);
    repository.create.mockResolvedValue(contract());
    await service.create('tenant-1', 'user-1', {
      propertyId: 'property-1',
      propertyStreetSnapshot: 'Dirección real',
      propertyStreetNumberSnapshot: '976',
      propertyFloorSnapshot: '4',
      propertyUnitSnapshot: 'B',
      startsOn: '2026-09-01',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 'property-1',
        propertyStreetSnapshot: 'Dirección real',
        propertyAddressSnapshot: 'Dirección real 976 Piso 4 Unidad B',
      }),
      [],
    );
  });

  it('activates a valid draft and ends an active contract', async () => {
    repository.findById
      .mockResolvedValueOnce(
        contract({
          endsOn: new Date('2027-09-01T00:00:00.000Z'),
          parties: [
            {
              role: 'RENTER',
              isPrimary: true,
              contact: { isActive: true },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        contract({
          status: RentalContractStatus.ACTIVE,
          endsOn: new Date('2027-09-01T00:00:00.000Z'),
          parties: [
            {
              role: 'RENTER',
              isPrimary: true,
              contact: { isActive: true },
            },
          ],
        }),
      );
    repository.hasActiveRentObligation.mockResolvedValue(true);
    repository.tenantTimeZone.mockResolvedValue(
      'America/Argentina/Buenos_Aires',
    );
    repository.activateWithRentRequirement.mockResolvedValueOnce(
      contract({ status: RentalContractStatus.ACTIVE }),
    );
    repository.transitionToTerminal.mockResolvedValueOnce(
      contract({ status: RentalContractStatus.ENDED }),
    );

    expect((await service.activate('contract-1', 'tenant-1')).status).toBe(
      'ACTIVE',
    );
    expect((await service.end('contract-1', 'tenant-1', 'user-1')).status).toBe(
      'ENDED',
    );
  });

  it('rejects activation without an active RENT obligation', async () => {
    repository.findById.mockResolvedValue(
      contract({
        endsOn: new Date('2027-09-01T00:00:00.000Z'),
        parties: [
          {
            role: 'RENTER',
            isPrimary: true,
            contact: { isActive: true },
          },
        ],
      }),
    );
    repository.hasActiveRentObligation.mockResolvedValue(false);

    await expect(service.activate('contract-1', 'tenant-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects invalid transitions', async () => {
    repository.findById.mockResolvedValue(
      contract({ status: RentalContractStatus.ENDED }),
    );
    await expect(service.activate('contract-1', 'tenant-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('does not allow removing the renter from an active contract', async () => {
    repository.findById.mockResolvedValue(
      contract({
        status: RentalContractStatus.ACTIVE,
        endsOn: new Date('2027-09-01T00:00:00.000Z'),
        parties: [
          {
            role: 'RENTER',
            isPrimary: true,
            contact: { isActive: true },
          },
        ],
      }),
    );

    await expect(
      service.update('contract-1', 'tenant-1', { parties: [] }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects activation without exactly one primary renter', async () => {
    repository.findById.mockResolvedValue(
      contract({
        endsOn: new Date('2027-09-01T00:00:00.000Z'),
        parties: [
          { role: 'RENTER', isPrimary: false, contact: { isActive: true } },
          { role: 'RENTER', isPrimary: false, contact: { isActive: true } },
        ],
      }),
    );

    await expect(service.activate('contract-1', 'tenant-1')).rejects.toThrow(
      /Exactly one primary renter/,
    );
    expect(repository.activateWithRentRequirement).not.toHaveBeenCalled();
  });

  it('activates with multiple renters when exactly one is primary', async () => {
    repository.findById.mockResolvedValue(
      contract({
        endsOn: new Date('2027-09-01T00:00:00.000Z'),
        parties: [
          {
            role: 'RENTER',
            isPrimary: true,
            contact: { isActive: true },
          },
          {
            role: 'RENTER',
            isPrimary: false,
            contact: { isActive: true },
          },
        ],
      }),
    );
    repository.hasActiveRentObligation.mockResolvedValue(true);
    repository.activateWithRentRequirement.mockResolvedValue(
      contract({ status: RentalContractStatus.ACTIVE }),
    );

    await expect(service.activate('contract-1', 'tenant-1')).resolves.toEqual(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
  });

  it('rejects a landlord marked as primary', async () => {
    repository.contactsByIds.mockResolvedValue([
      { id: 'landlord-1', contactPoints: [] },
    ]);
    await expect(
      service.create('tenant-1', 'user-1', {
        propertyStreetSnapshot: 'Av. Rivadavia',
        startsOn: '2026-09-01',
        parties: [
          {
            contactId: 'landlord-1',
            role: 'LANDLORD',
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toThrow(/Only a renter/);
  });

  it('rejects activation when the term is shorter than one calendar month', async () => {
    repository.findById.mockResolvedValue(
      contract({
        startsOn: new Date('2026-01-31T00:00:00.000Z'),
        endsOn: new Date('2026-02-27T00:00:00.000Z'),
        parties: [
          {
            role: 'RENTER',
            isPrimary: true,
            contact: { isActive: true },
          },
        ],
      }),
    );

    await expect(service.activate('contract-1', 'tenant-1')).rejects.toThrow(
      /at least one calendar month/,
    );
  });

  it.each([RentalContractStatus.ACTIVE, RentalContractStatus.ENDED])(
    'renews a contract in %s status',
    async (status) => {
      repository.renew.mockResolvedValue({
        outcome: 'CREATED',
        contract: contract({
          id: 'contract-2',
          internalNumber: 'ALQ-000002',
          previousContract: {
            id: 'contract-1',
            internalNumber: 'ALQ-000001',
            status,
          },
        }),
      });

      const result = await service.renew('contract-1', 'tenant-1', 'user-1');
      expect(result.internalNumber).toBe('ALQ-000002');
      expect(repository.renew).toHaveBeenCalledWith(
        'contract-1',
        'tenant-1',
        'user-1',
      );
    },
  );

  it.each([RentalContractStatus.DRAFT, RentalContractStatus.CANCELLED])(
    'rejects renewal from %s',
    async (status) => {
      repository.renew.mockResolvedValue({ outcome: 'INVALID_STATUS', status });
      await expect(
        service.renew('contract-1', 'tenant-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    },
  );

  it('returns a conflict naming an existing renewal', async () => {
    repository.renew.mockResolvedValue({
      outcome: 'ALREADY_RENEWED',
      contract: contract({ internalNumber: 'ALQ-000002' }),
    });
    await expect(
      service.renew('contract-1', 'tenant-1', 'user-1'),
    ).rejects.toThrow(/ALQ-000002/);
  });

  it('maps a concurrent successor unique conflict to the existing renewal', async () => {
    repository.renew.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique successor', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    repository.findRenewalByPrevious.mockResolvedValue(
      contract({ id: 'contract-2', internalNumber: 'ALQ-000002' }),
    );

    await expect(
      service.renew('contract-1', 'tenant-1', 'user-1'),
    ).rejects.toThrow(/ALQ-000002/);
    expect(repository.findRenewalByPrevious).toHaveBeenCalledWith(
      'contract-1',
      'tenant-1',
    );
  });
});
