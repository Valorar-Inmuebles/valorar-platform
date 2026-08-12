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
});
