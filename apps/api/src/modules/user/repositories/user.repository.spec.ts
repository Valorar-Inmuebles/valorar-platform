jest.mock('../../../../generated/prisma/client', () => ({
  UserRole: {
    TENANT_ADMIN: 'TENANT_ADMIN',
    AGENT: 'AGENT',
  },
  Prisma: {},
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { UserRepository } from './user.repository';

describe('UserRepository.withTenantUserLocks', () => {
  it('locks Tenant before User to serialize last-admin checks', async () => {
    const queryRaw = jest.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('"Tenant"')) {
        return [{ id: 'tenant-1' }];
      }
      if (sql.includes('"User"')) {
        return [
          {
            id: 'user-2',
            tenantId: 'tenant-1',
            role: 'AGENT',
            isActive: true,
            lastLoginAt: null,
          },
        ];
      }
      return [];
    });

    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = { $queryRaw: queryRaw };
        return fn(tx);
      },
    };

    const repository = new UserRepository(prisma as never);

    await repository.withTenantUserLocks('tenant-1', 'user-2', async () => {
      return undefined;
    });

    expect(queryRaw).toHaveBeenCalledTimes(2);
    const firstSql = (queryRaw.mock.calls[0][0] as TemplateStringsArray).join(
      '?',
    );
    const secondSql = (queryRaw.mock.calls[1][0] as TemplateStringsArray).join(
      '?',
    );
    expect(firstSql).toContain('"Tenant"');
    expect(firstSql).toContain('FOR UPDATE');
    expect(secondSql).toContain('"User"');
    expect(secondSql).toContain('FOR UPDATE');
  });
});

describe('UserRepository.getPropertyCountsByUserIds', () => {
  it('aggregates assigned and created counts in two groupBy queries', async () => {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce([
        { assignedToId: 'user-1', _count: { _all: 4 } },
        { assignedToId: 'user-2', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { createdById: 'user-1', _count: { _all: 7 } },
        { createdById: 'user-3', _count: { _all: 2 } },
      ]);

    const prisma = { property: { groupBy } };
    const repository = new UserRepository(prisma as never);

    const result = await repository.getPropertyCountsByUserIds('tenant-1', [
      'user-1',
      'user-2',
      'user-3',
    ]);

    expect(groupBy).toHaveBeenCalledTimes(2);
    expect(groupBy.mock.calls[0][0]).toMatchObject({
      by: ['assignedToId'],
      where: { tenantId: 'tenant-1', assignedToId: { in: ['user-1', 'user-2', 'user-3'] } },
    });
    expect(groupBy.mock.calls[1][0]).toMatchObject({
      by: ['createdById'],
      where: { tenantId: 'tenant-1', createdById: { in: ['user-1', 'user-2', 'user-3'] } },
    });
    expect(result.assigned.get('user-1')).toBe(4);
    expect(result.assigned.get('user-2')).toBe(1);
    expect(result.created.get('user-1')).toBe(7);
    expect(result.created.get('user-3')).toBe(2);
    expect(result.assigned.has('user-3')).toBe(false);
  });

  it('returns empty maps without querying when userIds is empty', async () => {
    const groupBy = jest.fn();
    const prisma = { property: { groupBy } };
    const repository = new UserRepository(prisma as never);

    const result = await repository.getPropertyCountsByUserIds('tenant-1', []);

    expect(groupBy).not.toHaveBeenCalled();
    expect(result.assigned.size).toBe(0);
    expect(result.created.size).toBe(0);
  });
});
