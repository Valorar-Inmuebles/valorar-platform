import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
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
    renterContactId: null,
    renterContact: null,
    landlordContactId: null,
    landlordContact: null,
    createdById: 'user-1',
    propertyAddressSnapshot: 'Av. Rivadavia 1234',
    propertyLocalitySnapshot: null,
    propertyUnitSnapshot: null,
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
    contactBelongsToTenant: jest.fn(),
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
  });

  it('creates contracts as DRAFT', async () => {
    repository.create.mockResolvedValue(contract());
    const result = await service.create('tenant-1', 'user-1', {
      propertyAddressSnapshot: 'Av. Rivadavia 1234',
      startsOn: '2026-09-01',
    });
    expect(result.status).toBe(RentalContractStatus.DRAFT);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', status: 'DRAFT' }),
    );
  });

  it.each([
    ['property', { propertyId: 'property-other' }, 'propertyBelongsToTenant'],
    ['renter', { renterContactId: 'renter-other' }, 'contactBelongsToTenant'],
    [
      'landlord',
      { landlordContactId: 'landlord-other' },
      'contactBelongsToTenant',
    ],
  ])(
    'rejects a cross-tenant %s reference',
    async (_label, reference, check) => {
      const checker =
        check === 'propertyBelongsToTenant'
          ? repository.propertyBelongsToTenant
          : repository.contactBelongsToTenant;
      checker.mockResolvedValue(false);
      await expect(
        service.create('tenant-1', 'user-1', {
          propertyAddressSnapshot: 'Av. Rivadavia 1234',
          startsOn: '2026-09-01',
          ...reference,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('activates a valid draft and ends an active contract', async () => {
    repository.findById
      .mockResolvedValueOnce(contract({ renterContactId: 'renter-1' }))
      .mockResolvedValueOnce(
        contract({
          status: RentalContractStatus.ACTIVE,
          renterContactId: 'renter-1',
        }),
      );
    repository.contactBelongsToTenant.mockResolvedValue(true);
    repository.update
      .mockResolvedValueOnce(contract({ status: RentalContractStatus.ACTIVE }))
      .mockResolvedValueOnce(contract({ status: RentalContractStatus.ENDED }));

    expect((await service.activate('contract-1', 'tenant-1')).status).toBe(
      'ACTIVE',
    );
    expect((await service.end('contract-1', 'tenant-1')).status).toBe('ENDED');
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
        renterContactId: 'renter-1',
      }),
    );

    await expect(
      service.update('contract-1', 'tenant-1', { renterContactId: null }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
