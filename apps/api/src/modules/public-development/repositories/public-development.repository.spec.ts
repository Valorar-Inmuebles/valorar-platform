jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { DEVELOPMENT_LIST_ORDER_BY } from '../../development/constants/list-order';
import { PublicDevelopmentRepository } from './public-development.repository';

describe('PublicDevelopmentRepository list order', () => {
  it('uses editorial order instead of updatedAt', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { development: { findMany, count } };
    const repository = new PublicDevelopmentRepository(prisma as never);

    await repository.findManyPublic('tenant-1', {}, { page: 1, limit: 12 });

    expect(findMany.mock.calls[0][0].orderBy).toEqual(DEVELOPMENT_LIST_ORDER_BY);
    expect(JSON.stringify(findMany.mock.calls[0][0].orderBy)).not.toContain(
      'updatedAt',
    );
  });
});
