/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PropertyRepository } from './property.repository';
import { Prisma } from '../../../../generated/prisma/client';

describe('PropertyRepository propertyInclude', () => {
  it('touches updatedAt on the authorized attribute-only PATCH', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'property-1' });
    const repository = new PropertyRepository({
      property: { update },
    } as never);
    await repository.update('property-1', 'tenant-1', {});
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'property-1', tenantId: 'tenant-1' },
        data: { updatedAt: expect.any(Date) },
      }),
    );
  });
  it('returns null on a scoped update miss and propagates other Prisma failures', async () => {
    const update = jest.fn();
    const repository = new PropertyRepository({
      property: { update },
    } as never);
    update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('P2025', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(
      repository.update('foreign-property', 'tenant-1', { title: 'Changed' }),
    ).resolves.toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-property', tenantId: 'tenant-1' },
      }),
    );
    update.mockRejectedValue(new Error('Connection failed'));
    await expect(
      repository.update('property-1', 'tenant-1', {}),
    ).rejects.toThrow('Connection failed');
  });
  it('loads createdBy and compact listing types in the same findMany query (no N+1)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { property: { findMany } };
    const repository = new PropertyRepository(prisma as never);

    await repository.findMany('tenant-1');

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].include).toMatchObject({
      geoCountry: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
        },
      },
      listings: {
        select: {
          listingType: true,
        },
      },
    });
  });

  it('uses the same creator projection for findManyWithCreator', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { property: { findMany } };
    const repository = new PropertyRepository(prisma as never);

    await repository.findManyWithCreator('tenant-1');

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].include.createdBy.select).toEqual({
      id: true,
      name: true,
      email: true,
      isActive: true,
    });
  });

  it('searches active and inactive properties with a compact paginated projection', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      property: { findMany, count },
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };
    const repository = new PropertyRepository(prisma as never);

    await repository.searchForRental('tenant-1', {
      search: 'Rivadavia',
      page: 2,
      pageSize: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          OR: expect.any(Array),
        }),
        select: expect.objectContaining({
          id: true,
          isActive: true,
          street: true,
          countryId: true,
          localityId: true,
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('isActive');
  });
});
