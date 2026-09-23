jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalContractStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT' },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { CommunicationInboundRepository } from './communication-inbound.repository';

describe('CommunicationInboundRepository inbound read model', () => {
  it('scopes filters to the tenant and applies receivedAt [from, to) plus contract/contact', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      communicationInboundMessage: { findMany, count },
    };
    const repository = new CommunicationInboundRepository(prisma as never);

    const result = await repository.listReadModel('tenant-1', {
      page: 2,
      pageSize: 10,
      contractId: 'contract-1',
      contactId: 'contact-1',
      receivedFrom: '2026-09-22T00:00:00.000Z',
      receivedTo: '2026-09-23T00:00:00.000Z',
    });

    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
    type InboundInput = {
      where: {
        tenantId: string;
        contractId?: string;
        contactId?: string;
        receivedAt?: { gte: Date; lt: Date };
      };
      skip: number;
      take: number;
    };
    const inboundCalls = findMany.mock.calls as unknown as Array<
      [InboundInput]
    >;
    const input = inboundCalls[0][0];
    expect(input.where.tenantId).toBe('tenant-1');
    expect(input.where.contractId).toBe('contract-1');
    expect(input.where.contactId).toBe('contact-1');
    expect(input.where.receivedAt).toEqual({
      gte: new Date('2026-09-22T00:00:00.000Z'),
      lt: new Date('2026-09-23T00:00:00.000Z'),
    });
    expect(input.skip).toBe(10);
    expect(input.take).toBe(10);
    expect(count).toHaveBeenCalledWith({ where: input.where });
  });

  it('defaults pagination and keeps the tenant guard when no filters are provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      communicationInboundMessage: { findMany, count },
    };
    const repository = new CommunicationInboundRepository(prisma as never);

    await repository.listReadModel('tenant-1', { page: 1 });

    type InboundInput = { where: unknown; skip: number; take: number };
    const inboundCalls = findMany.mock.calls as unknown as Array<
      [InboundInput]
    >;
    const input = inboundCalls[0][0];
    expect(input.where).toEqual({ tenantId: 'tenant-1' });
    expect(input.skip).toBe(0);
    expect(input.take).toBe(20);
    expect(count).toHaveBeenCalledWith({ where: input.where });
  });

  it('adds pending-queue filters and attention state to the inbound list', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      communicationInboundMessage: { findMany, count },
    };
    const repository = new CommunicationInboundRepository(prisma as never);

    await repository.listReadModel('tenant-1', {
      page: 1,
      unread: true,
      unacknowledged: true,
    });

    type InboundInput = {
      where: {
        tenantId: string;
        readAt?: null;
        acknowledgedAt?: null;
      };
      select?: { readAt?: boolean; acknowledgedAt?: boolean };
      skip: number;
      take: number;
    };
    const inboundCalls = findMany.mock.calls as unknown as Array<
      [InboundInput]
    >;
    const input = inboundCalls[0][0];
    expect(input.where).toEqual({
      tenantId: 'tenant-1',
      readAt: null,
      acknowledgedAt: null,
    });
    expect(input.select?.readAt).toBe(true);
    expect(input.select?.acknowledgedAt).toBe(true);
  });
});

describe('CommunicationInboundRepository inbound attention actions', () => {
  type StateFixture = {
    id: string;
    readAt: Date | null;
    acknowledgedAt: Date | null;
    acknowledgedById: string | null;
    acknowledgedBy: { id: string; name: string } | null;
  };
  const state: StateFixture = {
    id: 'm1',
    readAt: new Date('2026-09-22T13:05:00.000Z'),
    acknowledgedAt: new Date('2026-09-22T13:10:00.000Z'),
    acknowledgedById: 'user-1',
    acknowledgedBy: { id: 'user-1', name: 'Juan Pérez' },
  };

  function prismaWithTx(inbound: {
    findFirst?: jest.Mock;
    updateMany?: jest.Mock;
  }) {
    const tx = { communicationInboundMessage: inbound };
    return {
      $transaction: jest.fn(
        async (fn: (t: typeof tx) => Promise<unknown>): Promise<unknown> =>
          fn(tx),
      ),
      communicationInboundMessage: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
  }

  it('mark-read sets readAt with compare-and-set and keeps the first timestamp (idempotent)', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ readAt: null })
      .mockResolvedValueOnce(state);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const result = await repository.markInboundRead({
      tenantId: 'tenant-1',
      messageId: 'm1',
      now: new Date('2026-09-22T13:05:00.000Z'),
    });

    expect(result.status).toBe('UPDATED');
    expect(result.message).toEqual(state);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', tenantId: 'tenant-1', readAt: null },
      data: { readAt: new Date('2026-09-22T13:05:00.000Z') },
    });
    // acknowledgedAt is never part of the mark-read write.
    type UpdateManyCall = [{ where: unknown; data: Record<string, unknown> }];
    const updateCalls = updateMany.mock.calls as unknown as UpdateManyCall[];
    expect(updateCalls[0][0].data).not.toHaveProperty('acknowledgedAt');
  });

  it('mark-read on an already-read message is a no-op that preserves the original readAt', async () => {
    const originalReadAt = new Date('2026-09-22T12:00:00.000Z');
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ readAt: originalReadAt })
      .mockResolvedValueOnce({
        ...state,
        readAt: originalReadAt,
      });
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const result = await repository.markInboundRead({
      tenantId: 'tenant-1',
      messageId: 'm1',
      now: new Date('2026-09-22T13:05:00.000Z'),
    });

    expect(result.status).toBe('NOOP');
    expect(result.message?.readAt).toEqual(originalReadAt);
  });

  it('mark-read and acknowledge return NOT_FOUND and never write for a foreign tenant', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const updateMany = jest.fn();
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const read = await repository.markInboundRead({
      tenantId: 'tenant-other',
      messageId: 'm1',
      now: new Date(),
    });
    const ack = await repository.acknowledgeInbound({
      tenantId: 'tenant-other',
      messageId: 'm1',
      now: new Date(),
      acknowledgedById: 'user-1',
    });

    expect(read.status).toBe('NOT_FOUND');
    expect(ack.status).toBe('NOT_FOUND');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('acknowledge sets acknowledgedAt, the actor and readAt (implies read)', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ acknowledgedAt: null })
      .mockResolvedValueOnce(state);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const result = await repository.acknowledgeInbound({
      tenantId: 'tenant-1',
      messageId: 'm1',
      now: new Date('2026-09-22T13:10:00.000Z'),
      acknowledgedById: 'user-1',
    });

    expect(result.status).toBe('UPDATED');
    expect(result.message).toEqual(state);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'm1', tenantId: 'tenant-1', acknowledgedAt: null },
      data: {
        acknowledgedAt: new Date('2026-09-22T13:10:00.000Z'),
        acknowledgedById: 'user-1',
      },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'm1', tenantId: 'tenant-1', readAt: null },
      data: { readAt: new Date('2026-09-22T13:10:00.000Z') },
    });
  });

  it('acknowledge on an already-acknowledged message preserves the original actor and writes nothing', async () => {
    const originalState = {
      ...state,
      acknowledgedAt: new Date('2026-09-22T11:00:00.000Z'),
      acknowledgedById: 'user-original',
      acknowledgedBy: { id: 'user-original', name: 'Ana Original' },
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ acknowledgedAt: originalState.acknowledgedAt })
      .mockResolvedValueOnce(originalState);
    const updateMany = jest.fn();
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const result = await repository.acknowledgeInbound({
      tenantId: 'tenant-1',
      messageId: 'm1',
      now: new Date('2026-09-22T13:10:00.000Z'),
      acknowledgedById: 'user-2',
    });

    expect(result.status).toBe('ALREADY_ACKNOWLEDGED');
    expect(result.message?.acknowledgedById).toBe('user-original');
    expect(result.message?.acknowledgedAt).toEqual(
      originalState.acknowledgedAt,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('acknowledge loses a concurrent race to null without clobbering the winner state', async () => {
    const winnerState = {
      ...state,
      acknowledgedById: 'user-winner',
      acknowledgedBy: { id: 'user-winner', name: 'Ganó Primero' },
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ acknowledgedAt: null })
      .mockResolvedValueOnce(winnerState);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = prismaWithTx({ findFirst, updateMany });
    const repository = new CommunicationInboundRepository(
      prisma as unknown as never,
    );

    const result = await repository.acknowledgeInbound({
      tenantId: 'tenant-1',
      messageId: 'm1',
      now: new Date('2026-09-22T13:10:00.000Z'),
      acknowledgedById: 'user-loser',
    });

    expect(result.status).toBe('NOOP');
    expect(result.message?.acknowledgedById).toBe('user-winner');
  });
});
