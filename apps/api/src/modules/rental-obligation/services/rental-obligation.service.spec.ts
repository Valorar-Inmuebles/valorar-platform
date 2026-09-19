import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
  Currency: { ARS: 'ARS', USD: 'USD' },
  RentalAmountMode: { FIXED: 'FIXED', VARIABLE: 'VARIABLE' },
  RentalDueMode: {
    FIXED_DAY: 'FIXED_DAY',
    MANUAL_PER_PERIOD: 'MANUAL_PER_PERIOD',
  },
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
  RentalDueMode,
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
    dueMode: RentalDueMode.FIXED_DAY,
    dueDay: 10,
    amountMode: RentalAmountMode.FIXED,
    defaultAmount: 100000,
    adjustmentIntervalMonths: 3,
    includeInNotice: true,
    showAmount: true,
    rentValueRevisions: [
      {
        id: 'revision-1',
        effectiveFrom: contract.startsOn,
        amount: 100000,
        currency: Currency.ARS,
        createdAt: now,
      },
    ],
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
    updateWithInitialRevision: jest.fn(),
    createRentValueRevision: jest.fn(),
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
      undefined,
    );
  });

  it('keeps RENT recurring and reserves adjustment intervals for RENT', async () => {
    await expect(
      service.create(
        'tenant-1',
        validDto({
          kind: RentalObligationKind.ONE_TIME,
          recurrenceMonths: null,
          dueDay: null,
          oneTimeDueDate: '2026-09-10',
        }),
      ),
    ).rejects.toThrow(/recurring/);

    repository.findConcept.mockResolvedValue({
      id: 'concept-extra',
      isActive: true,
      systemCode: null,
    });
    await expect(
      service.create(
        'tenant-1',
        validDto({
          conceptId: 'concept-extra',
          adjustmentIntervalMonths: 3,
        }),
      ),
    ).rejects.toThrow(/only available for RENT/);
  });

  it('copies the default amount into new occurrence seeds only', async () => {
    await service.create('tenant-1', validDto());
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentIntervalMonths: null,
        includeInNotice: true,
        showAmount: true,
      }),
      expect.objectContaining({
        effectiveFrom: contract.startsOn,
        amount: 100000,
        currency: Currency.ARS,
      }),
    );
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

  it('requires the specific adjustment operation after the initial revision', async () => {
    repository.findById.mockResolvedValue(obligation());
    repository.findConcept.mockResolvedValue(concept);
    repository.update.mockResolvedValue(obligation({ defaultAmount: 200000 }));

    await expect(
      service.update('obligation-1', 'tenant-1', {
        defaultAmount: 200000,
      }),
    ).rejects.toThrow(/rent-adjustments/);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('protects RENT identity and its initial revision boundary', async () => {
    repository.findById.mockResolvedValue(obligation());
    repository.findConcept.mockResolvedValue({
      id: 'concept-extra',
      isActive: true,
      systemCode: null,
    });
    await expect(
      service.update('obligation-1', 'tenant-1', {
        conceptId: 'concept-extra',
      }),
    ).rejects.toThrow(/cannot change/);

    repository.findConcept.mockResolvedValue(concept);
    await expect(
      service.update('obligation-1', 'tenant-1', {
        startsOn: '2026-10-01',
      }),
    ).rejects.toThrow(/startsOn cannot change/);
  });

  it('preserves a nullable adjustment interval on an ACTIVE legacy RENT', async () => {
    const activeLegacy = obligation({
      adjustmentIntervalMonths: null,
      contract: { ...contract, status: RentalContractStatus.ACTIVE },
    });
    repository.findById.mockResolvedValue(activeLegacy);
    repository.findConcept.mockResolvedValue(concept);
    repository.update.mockResolvedValue(activeLegacy);

    await expect(
      service.update('obligation-1', 'tenant-1', { includeInNotice: true }),
    ).resolves.toBeDefined();
  });

  it('derives OVERDUE without persisting it', async () => {
    repository.findOccurrences.mockResolvedValue([occurrence()]);
    const [result] = await service.listOccurrences('tenant-1', {});
    expect(result.operationalStatus).toBe('OVERDUE');
    expect(result.status).toBe(RentalOccurrenceStatus.PENDING);
  });

  it('never derives OVERDUE when a manual due date is pending', async () => {
    repository.findOccurrences.mockResolvedValue([
      occurrence({ dueDate: null }),
    ]);
    const [result] = await service.listOccurrences('tenant-1', {});
    expect(result.operationalStatus).toBe('PENDING');
    expect(result.dueDatePending).toBe(true);
  });

  it.each([0, 13])('rejects recurrenceMonths=%i', async (value) => {
    await expect(
      service.create('tenant-1', validDto({ recurrenceMonths: value })),
    ).rejects.toThrow(/between 1 and 12/);
  });

  it.each([1, 12])(
    'accepts recurrenceMonths=%i for additional obligations',
    async (value) => {
      repository.findConcept.mockResolvedValue({
        id: 'concept-extra',
        isActive: true,
        systemCode: null,
      });
      await expect(
        service.create(
          'tenant-1',
          validDto({ conceptId: 'concept-extra', recurrenceMonths: value }),
        ),
      ).resolves.toBeDefined();
    },
  );

  it('enforces notice flags and defaults additional obligations to false', async () => {
    repository.findConcept.mockResolvedValue({
      id: 'concept-extra',
      isActive: true,
      systemCode: null,
    });
    await expect(
      service.create(
        'tenant-1',
        validDto({
          conceptId: 'concept-extra',
          showAmount: true,
        }),
      ),
    ).rejects.toThrow(/showAmount/);
    await service.create('tenant-1', validDto({ conceptId: 'concept-extra' }));
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeInNotice: false, showAmount: false }),
      undefined,
    );
  });

  it('rejects currency changes and registers a valid rent revision', async () => {
    repository.findById.mockResolvedValue(obligation());
    await expect(
      service.createRentAdjustment('obligation-1', 'tenant-1', 'user-1', {
        effectiveFrom: '2026-12-01',
        amount: 120000,
        currency: Currency.USD,
      }),
    ).rejects.toThrow(/currency/);

    repository.createRentValueRevision.mockResolvedValue({
      id: 'revision-2',
      tenantId: 'tenant-1',
      obligationId: 'obligation-1',
      effectiveFrom: new Date('2026-12-01T00:00:00.000Z'),
      amount: 120000,
      currency: Currency.ARS,
      recordedById: 'user-1',
      reason: null,
      createdAt: now,
    });
    await service.createRentAdjustment('obligation-1', 'tenant-1', 'user-1', {
      effectiveFrom: '2026-12-01',
      amount: 120000,
      currency: Currency.ARS,
    });
    expect(repository.createRentValueRevision).toHaveBeenCalledWith(
      'obligation-1',
      'tenant-1',
      expect.objectContaining({ amount: 120000, recordedById: 'user-1' }),
    );
  });

  it('assigns a due date only to a pending manual occurrence', async () => {
    const manual = occurrence({
      dueDate: null,
      obligation: obligation({ dueMode: RentalDueMode.MANUAL_PER_PERIOD }),
    });
    repository.findOccurrence.mockResolvedValue(manual);
    repository.updatePendingOccurrence.mockResolvedValue({
      ...manual,
      dueDate: new Date('2026-09-20T00:00:00.000Z'),
    });
    await service.updateDueDate('occurrence-1', 'tenant-1', '2026-09-20');
    expect(repository.updatePendingOccurrence).toHaveBeenCalledWith(
      'occurrence-1',
      'tenant-1',
      { dueDate: new Date('2026-09-20T00:00:00.000Z') },
    );
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
