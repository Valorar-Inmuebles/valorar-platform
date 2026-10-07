jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
import { PropertyDetailContextRepository } from './property-detail-context.repository';
import type { Prisma } from '../../../../generated/prisma/client';

describe('PropertyDetailContextRepository tenant boundary', () => {
  it.each(['tenant-1', 'tenant-2'])(
    'scopes root, prices, listings, cover and counts to %s',
    async (tenantId) => {
      const findFirst = jest
        .fn<Promise<null>, [Prisma.PropertyFindFirstArgs]>()
        .mockResolvedValue(null);
      const repository = new PropertyDetailContextRepository({
        property: { findFirst },
      } as never);
      // A conflicting visibility clause must never override the effective tenant/id.
      await repository.findVisible('property-1', tenantId, {
        tenantId: 'other-tenant',
        id: 'other-property',
      });
      expect(findFirst).toHaveBeenCalledTimes(1);
      const query = findFirst.mock.calls[0][0];
      expect(query.where).toEqual({
        AND: [
          { id: 'property-1', tenantId },
          { tenantId: 'other-tenant', id: 'other-property' },
        ],
      });
      expect(query.include).toMatchObject({
        listings: {
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
          include: {
            prices: {
              where: { tenantId },
              orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
            },
          },
        },
        images: {
          where: { tenantId, isCover: true },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            images: { where: { tenantId } },
            featureAssignments: { where: { tenantId } },
          },
        },
      });
      expect(query.include).not.toHaveProperty('featureAssignments');
    },
  );
});
