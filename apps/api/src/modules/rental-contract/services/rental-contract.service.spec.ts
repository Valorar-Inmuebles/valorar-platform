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
}));

jest.mock('../repositories/rental-contract.repository', () => ({
  RentalContractRepository: class RentalContractRepository {},
}));

import { RentalContractStatus } from '../../../../generated/prisma/client';
import { RentalContractRepository } from '../repositories/rental-contract.repository';
import { RentalContractService } from './rental-contract.service';

const now = new Date('2026-09-09T00:00:00.000Z');

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-1',
    tenantId: 'tenant-1',
    propertyId: null,
    property: null,
    parties: [],
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
          parties: [{ role: 'RENTER', contact: { isActive: true } }],
        }),
      )
      .mockResolvedValueOnce(
        contract({
          status: RentalContractStatus.ACTIVE,
          parties: [{ role: 'RENTER', contact: { isActive: true } }],
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
      contract({ parties: [{ role: 'RENTER', contact: { isActive: true } }] }),
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
        parties: [{ role: 'RENTER', contact: { isActive: true } }],
      }),
    );

    await expect(
      service.update('contract-1', 'tenant-1', { parties: [] }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
