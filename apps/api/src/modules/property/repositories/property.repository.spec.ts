/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PropertyRepository } from './property.repository';

describe('PropertyRepository propertyInclude', () => {
  it('loads createdBy in the same findMany query (no N+1)', async () => {
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
