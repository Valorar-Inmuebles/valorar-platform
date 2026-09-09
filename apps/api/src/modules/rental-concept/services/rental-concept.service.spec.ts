import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
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

jest.mock('../repositories/rental-concept.repository', () => ({
  RentalConceptRepository: class RentalConceptRepository {},
}));

import { DEFAULT_RENTAL_CONCEPTS } from '../rental-concept.defaults';
import { RentalConceptRepository } from '../repositories/rental-concept.repository';
import { RentalConceptService } from './rental-concept.service';

describe('RentalConceptService', () => {
  let service: RentalConceptService;
  const repository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    updateActive: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RentalConceptService,
        { provide: RentalConceptRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(RentalConceptService);
  });

  it('defines the seven approved base concepts', () => {
    expect(
      DEFAULT_RENTAL_CONCEPTS.map((concept) => concept.systemCode),
    ).toEqual([
      'RENT',
      'EXPENSES',
      'ELECTRICITY',
      'GAS',
      'ABL',
      'AYSA',
      'INSURANCE',
    ]);
  });

  it('creates a custom tenant concept without a system code', async () => {
    repository.findBySlug.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 'concept-1',
      tenantId: 'tenant-1',
      name: 'Internet',
      slug: 'internet',
      systemCode: null,
      isActive: true,
      sortOrder: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create('tenant-1', {
      name: ' Internet ',
      slug: 'INTERNET',
    });

    expect(result.systemCode).toBeNull();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Internet',
        slug: 'internet',
        systemCode: null,
      }),
    );
  });

  it('rejects a duplicate tenant slug', async () => {
    repository.findBySlug.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create('tenant-1', { name: 'Internet', slug: 'internet' }),
    ).rejects.toThrow(ConflictException);
  });
});
