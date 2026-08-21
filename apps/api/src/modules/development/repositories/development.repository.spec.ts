jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { DEVELOPMENT_LIST_ORDER_BY } from '../constants/list-order';
import { DevelopmentRepository } from './development.repository';

describe('DevelopmentRepository list order', () => {
  it('does not order listings by updatedAt', () => {
    expect(DEVELOPMENT_LIST_ORDER_BY).toEqual([
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);
    expect(
      DEVELOPMENT_LIST_ORDER_BY.some((entry) => 'updatedAt' in entry),
    ).toBe(false);
  });

  it('uses editorial order for findMany', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { development: { findMany } };
    const repository = new DevelopmentRepository(prisma as never);

    await repository.findMany('tenant-1');

    expect(findMany.mock.calls[0][0].orderBy).toEqual(DEVELOPMENT_LIST_ORDER_BY);
  });
});
