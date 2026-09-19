import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
  Currency: { ARS: 'ARS', USD: 'USD' },
  RentalAmountMode: { FIXED: 'FIXED', VARIABLE: 'VARIABLE' },
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
}));
jest.mock('../repositories/rental-obligation.repository', () => {
  class RentalFulfillmentConflictError extends Error {}
  return {
    RentalObligationRepository: class RentalObligationRepository {},
    RentalFulfillmentConflictError,
  };
});

import {
  Currency,
  RentalAmountMode,
  RentalContractStatus,
  RentalObligationKind,
  RentalOccurrenceStatus,
} from '../../../../generated/prisma/client';
import {
  RentalFulfillmentConflictError,
  RentalObligationRepository,
} from '../repositories/rental-obligation.repository';
import { RentalObligationService } from './rental-obligation.service';

const now = new Date('2026-09-09T00:00:00.000Z');
const contract = {
  id: 'contract-1',
  startsOn: new Date('2026-09-01T00:00:00.000Z'),
  endsOn: new Date('2027-08-31T00:00:00.000Z'),
  status: RentalContractStatus.DRAFT,
};
const concept = { id: 'concept-1', isActive: true, systemCode: 'RENT' };

function obligation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obligation-1',
    tenantId: 'tenant-1',
    contractId: contract.id,
    conceptId: concept.id,
    concept: { ...concept, name: 'Alquiler' },
    contract,
    kind: RentalObligationKind.RECURRING,
    recurrenceMonths: 1,
    dueDay: 10,
    amountMode: RentalAmountMode.FIXED,
    defaultAmount: 100000,
    currency: Currency.ARS,
    startsOn: contract.startsOn,
    endsOn: contract.endsOn,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function occurrence(overrides: Record<string, unknown> = {}) {
  return {
    id: 'occurrence-1',
    tenantId: 'tenant-1',
    obligationId: 'obligation-1',
    periodKey: '2026-09',
    periodStartsOn: new Date('2026-09-01T00:00:00.000Z'),
    periodEndsOn: new Date('2026-09-30T00:00:00.000Z'),
    dueDate: new Date('2026-09-07T00:00:00.000Z'),
    amount: 100000,
    currency: Currency.ARS,
    status: RentalOccurrenceStatus.PENDING,
    cancelledAt: null,
    cancelledById: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    obligation: {
      ...obligation(),
      contract: {
        id: contract.id,
        propertyAddressSnapshot: 'Av. Rivadavia 1234',
        parties: [
          { role: 'RENTER', contact: { id: 'contact-1', name: 'Ana' } },
        ],
      },
    },
    fulfillments: [],
    ...overrides,
  };
}

describe('RentalObligationService', () => {
  let service: RentalObligationService;
  const repository = {
    findContract: jest.fn(),
    findConcept: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    countActiveRent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createMissingOccurrences: jest.fn(),
    tenantTimeZone: jest.fn(),
    findOccurrences: jest.fn(),
    findOccurrence: jest.fn(),
    updatePendingOccurrence: jest.fn(),
    recordFulfillment: jest.fn(),
    findFulfillment: jest.fn(),
    reverseFulfillment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    repository.findContract.mockResolvedValue(contract);
    repository.findConcept.mockResolvedValue(concept);
    repository.countActiveRent.mockResolvedValue(0);
    repository.tenantTimeZone.mockResolvedValue(
      'America/Argentina/Buenos_Aires',
    );
    repository.create.mockResolvedValue(obligation());
    repository.createMissingOccurrences.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        RentalObligationService,
        { provide: RentalObligationRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(RentalObligationService);
  });

  afterEach(() => jest.useRealTimers());

  it('rejects cross-tenant contract and concept references', async () => {
    repository.findContract.mockResolvedValue(null);
    await expect(service.create('tenant-1', validDto())).rejects.toThrow(
      BadRequestException,
    );
    repository.findContract.mockResolvedValue(contract);
    repository.findConcept.mockResolvedValue(null);
    await expect(service.create('tenant-1', validDto())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a second active RENT obligation', async () => {
    repository.countActiveRent.mockResolvedValue(1);
    await expect(service.create('tenant-1', validDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('requires fixed amounts but permits nullable variable amounts', async () => {
    await expect(
      service.create('tenant-1', validDto({ defaultAmount: null })),
    ).rejects.toThrow(BadRequestException);
    await service.create(
      'tenant-1',
      validDto({ amountMode: RentalAmountMode.VARIABLE, defaultAmount: null }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ defaultAmount: null, currency: Currency.ARS }),
    );
  });

  it('copies the default amount into new occurrence seeds only', async () => {
    await service.create('tenant-1', validDto());
    expect(repository.createMissingOccurrences).toHaveBeenCalledWith(
      'obligation-1',
      'tenant-1',
      expect.arrayContaining([
        expect.objectContaining({
          periodKey: '2026-09',
          amount: 100000,
          currency: Currency.ARS,
        }),
      ]),
    );
  });

  it('does not rewrite materialized amounts when the obligation default changes', async () => {
    repository.findById.mockResolvedValue(obligation());
    repository.findConcept.mockResolvedValue(concept);
    repository.update.mockResolvedValue(obligation({ defaultAmount: 200000 }));

    await service.update('obligation-1', 'tenant-1', {
      defaultAmount: 200000,
    });

    expect(repository.updatePendingOccurrence).not.toHaveBeenCalled();
    expect(repository.createMissingOccurrences).toHaveBeenCalledWith(
      'obligation-1',
      'tenant-1',
      expect.arrayContaining([expect.objectContaining({ amount: 200000 })]),
    );
  });

  it('derives OVERDUE without persisting it', async () => {
    repository.findOccurrences.mockResolvedValue([occurrence()]);
    const [result] = await service.listOccurrences('tenant-1', {});
    expect(result.operationalStatus).toBe('OVERDUE');
    expect(result.status).toBe(RentalOccurrenceStatus.PENDING);
  });

  it('maps logical double fulfillment conflicts to HTTP conflict', async () => {
    repository.findOccurrence.mockResolvedValue(occurrence());
    repository.recordFulfillment.mockRejectedValue(
      new RentalFulfillmentConflictError(),
    );
    await expect(
      service.recordFulfillment('occurrence-1', 'tenant-1', 'user-1', {
        fulfilledOn: '2026-09-09',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('reverses fulfillment with an auditable reason', async () => {
    repository.findFulfillment.mockResolvedValue({
      id: 'fulfillment-1',
      occurrenceId: 'occurrence-1',
    });
    repository.reverseFulfillment.mockResolvedValue(occurrence());
    await service.reverseFulfillment(
      'fulfillment-1',
      'tenant-1',
      'manager-1',
      'Carga duplicada',
    );
    expect(repository.reverseFulfillment).toHaveBeenCalledWith(
      'fulfillment-1',
      'tenant-1',
      'occurrence-1',
      'manager-1',
      'Carga duplicada',
    );
  });
});

function validDto(overrides: Record<string, unknown> = {}) {
  return {
    contractId: contract.id,
    conceptId: concept.id,
    kind: RentalObligationKind.RECURRING,
    recurrenceMonths: 1,
    dueDay: 10,
    amountMode: RentalAmountMode.FIXED,
    defaultAmount: 100000,
    currency: Currency.ARS,
    startsOn: '2026-09-01',
    endsOn: '2027-08-31',
    ...overrides,
  };
}
