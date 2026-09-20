jest.mock('../../../../generated/prisma/client', () => ({
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalContractEventType: {
    ACTIVATED: 'ACTIVATED',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
    PARTIES_CHANGED: 'PARTIES_CHANGED',
    RENT_VALUE_REVISED: 'RENT_VALUE_REVISED',
    RENEWED: 'RENEWED',
  },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
  Currency: { ARS: 'ARS', USD: 'USD' },
  RentalAmountMode: { FIXED: 'FIXED', VARIABLE: 'VARIABLE' },
  RentalDueMode: {
    FIXED_DAY: 'FIXED_DAY',
    MANUAL_PER_PERIOD: 'MANUAL_PER_PERIOD',
  },
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListRentalOccurrencesQueryDto } from '../../rental-obligation/dto/rental-occurrence.dto';
import {
  ListRentalContractsQueryDto,
  RentalContractHistoryQueryDto,
} from './rental-contract-query.dto';

describe('Rental operational query DTOs', () => {
  it('rejects non-allowlisted contract sorting and pagination boundaries', async () => {
    const query = plainToInstance(ListRentalContractsQueryDto, {
      sortBy: 'updatedBySql',
      page: 0,
      pageSize: 101,
    });

    const errors = await validate(query);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'page',
      'pageSize',
      'sortBy',
    ]);
  });

  it('accepts the contract-list upper pagination boundary', async () => {
    const query = plainToInstance(ListRentalContractsQueryDto, {
      sortBy: 'endsOn',
      sortOrder: 'desc',
      page: 1,
      pageSize: 100,
    });

    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('accepts omitted pagination and lets services apply their defaults', async () => {
    await expect(
      validate(plainToInstance(ListRentalContractsQueryDto, {})),
    ).resolves.toHaveLength(0);
    await expect(
      validate(plainToInstance(ListRentalOccurrencesQueryDto, {})),
    ).resolves.toHaveLength(0);
    await expect(
      validate(plainToInstance(RentalContractHistoryQueryDto, {})),
    ).resolves.toHaveLength(0);
  });

  it('rejects invalid occurrence month, category and sorting', async () => {
    const query = plainToInstance(ListRentalOccurrencesQueryDto, {
      month: '2026-13',
      category: 'MESSAGES',
      sortBy: 'unsafe',
      page: 0,
      pageSize: 101,
    });

    const errors = await validate(query);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'category',
      'month',
      'page',
      'pageSize',
      'sortBy',
    ]);
  });
});
