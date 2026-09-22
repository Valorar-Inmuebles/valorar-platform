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
});
