jest.mock('../repositories/rental-reminder.repository', () => ({
  RentalReminderRepository: class {},
}));
jest.mock('../repositories/communication-inbound.repository', () => ({
  CommunicationInboundRepository: class {},
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {},
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RentalReminderService } from './rental-reminder.service';

describe('RentalReminderService contract history read model', () => {
  const repository = {
    findContractSummary: jest.fn(),
    findContractCommunicationsHistory: jest.fn(),
  };
  const service = new RentalReminderService(
    repository as never,
    { listReadModel: jest.fn() } as never,
  );

  const dispatchFixture = {
    id: 'dispatch-1',
    eventType: 'DUE',
    dueDate: new Date('2026-09-22T00:00:00.000Z'),
    scheduledFor: new Date('2026-09-22T13:00:00.000Z'),
    status: 'COMPLETED',
    firstAttemptAt: new Date('2026-09-22T13:00:00.000Z'),
    completedAt: new Date('2026-09-22T13:00:05.000Z'),
    recipientSnapshot: { contactId: 'contact-1', name: 'Juan Pérez' },
    deliveries: [
      {
        id: 'delivery-1',
        channel: 'WHATSAPP',
        status: 'READ',
        statusSource: 'PROVIDER_WEBHOOK',
        destinationSnapshot: '+5491131716941',
        sentAt: new Date('2026-09-22T13:00:01.000Z'),
        deliveredAt: new Date('2026-09-22T13:00:02.000Z'),
        readAt: new Date('2026-09-22T13:00:03.000Z'),
        failedAt: null,
        skippedAt: null,
        errorCategory: null,
        errorCode: null,
        errorMessage: null,
        attempts: [
          {
            attemptNumber: 1,
            status: 'ACCEPTED',
            startedAt: new Date('2026-09-22T13:00:01.000Z'),
            finishedAt: new Date('2026-09-22T13:00:01.500Z'),
            latencyMs: 500,
            errorCategory: null,
            errorCode: null,
            errorMessage: null,
          },
          {
            attemptNumber: 2,
            status: 'FAILED',
            startedAt: new Date('2026-09-22T13:00:02.000Z'),
            finishedAt: new Date('2026-09-22T13:00:03.000Z'),
            latencyMs: 1000,
            errorCategory: 'AUTHENTICATION',
            errorCode: 'META_190',
            errorMessage: 'Meta WhatsApp rejected the message request.',
          },
        ],
      },
    ],
    occurrences: [
      {
        occurrenceId: 'occ-1',
        status: 'INCLUDED',
        exclusionReason: null,
        occurrence: {
          dueDate: new Date('2026-09-30T00:00:00.000Z'),
          obligation: { concept: { name: 'Alquiler' } },
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps dispatches to the read model with masked destinations and sanitized errors', async () => {
    repository.findContractSummary.mockResolvedValue({
      id: 'contract-1',
      internalNumber: 'ALQ-000001',
    });
    repository.findContractCommunicationsHistory.mockResolvedValue([
      [dispatchFixture],
      1,
    ]);

    const result = await service.getContractHistory('tenant-1', 'contract-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result.contract).toEqual({
      id: 'contract-1',
      internalNumber: 'ALQ-000001',
    });
    expect(repository.findContractCommunicationsHistory).toHaveBeenCalledWith(
      'tenant-1',
      'contract-1',
      { page: 1, pageSize: 20 },
    );
    const item = result.items[0];
    expect(item).toMatchObject({
      id: 'dispatch-1',
      eventType: 'DUE',
      dueDate: '2026-09-22',
      scheduledFor: '2026-09-22T13:00:00.000Z',
      status: 'COMPLETED',
      recipient: { contactId: 'contact-1', name: 'Juan Pérez' },
    });
    // Destination is masked; the raw number is never exposed.
    expect(item.deliveries[0]).toMatchObject({
      destination: '+54*******6941',
      channel: 'WHATSAPP',
      status: 'READ',
      statusSource: 'PROVIDER_WEBHOOK',
      sentAt: '2026-09-22T13:00:01.000Z',
      deliveredAt: '2026-09-22T13:00:02.000Z',
      readAt: '2026-09-22T13:00:03.000Z',
      failedAt: null,
      error: null,
    });
    expect(item.deliveries[0].attempts[1]).toEqual({
      attemptNumber: 2,
      status: 'FAILED',
      startedAt: '2026-09-22T13:00:02.000Z',
      finishedAt: '2026-09-22T13:00:03.000Z',
      latencyMs: 1000,
      error: {
        category: 'AUTHENTICATION',
        code: 'META_190',
        message: 'Meta WhatsApp rejected the message request.',
      },
    });
    expect(item.occurrences[0]).toEqual({
      occurrenceId: 'occ-1',
      status: 'INCLUDED',
      exclusionReason: null,
      conceptName: 'Alquiler',
      dueDate: '2026-09-30',
    });
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('rejects history for a contract outside the tenant', async () => {
    repository.findContractSummary.mockResolvedValue(null);

    await expect(
      service.getContractHistory('tenant-1', 'contract-foreign', {
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findContractCommunicationsHistory).not.toHaveBeenCalled();
  });
});

describe('RentalReminderService inbound read model', () => {
  const repository = {
    listReadModel: jest.fn(),
  };
  const service = new RentalReminderService({} as never, repository as never);
  const messages = {
    items: [
      {
        id: 'm1',
        messageType: 'text',
        body: 'Pago mañana',
        receivedAt: new Date('2026-09-22T13:00:00.000Z'),
        senderAddress: '+5491131716941',
        deliveryId: 'delivery-1',
        contact: { id: 'contact-1', name: 'Juan' },
        contract: { id: 'contract-1', internalNumber: 'ALQ-000001' },
      },
      {
        id: 'm2',
        messageType: 'text',
        body: 'Hola',
        receivedAt: new Date('2026-09-22T14:00:00.000Z'),
        senderAddress: 'no-phone',
        deliveryId: null,
        contact: null,
        contract: null,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.listReadModel.mockResolvedValue(messages);
  });

  it('masks the sender, correlates deliveries and exposes wa.me only as functional PII', async () => {
    const result = await service.getInbound('tenant-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result.items[0]).toEqual({
      id: 'm1',
      receivedAt: '2026-09-22T13:00:00.000Z',
      messageType: 'text',
      body: 'Pago mañana',
      sender: { address: '+54*******6941' },
      contact: { id: 'contact-1', name: 'Juan' },
      contract: { id: 'contract-1', internalNumber: 'ALQ-000001' },
      deliveryCorrelated: true,
      externalReplyLink: 'https://wa.me/5491131716941',
    });
    // Non-phone senders get a masked address and no reply link.
    expect(result.items[1]).toMatchObject({
      sender: { address: 'no-****hone' },
      contact: null,
      contract: null,
      deliveryCorrelated: false,
      externalReplyLink: null,
    });
    expect(repository.listReadModel).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects a reversed receivedAt window', async () => {
    await expect(
      service.getInbound('tenant-1', {
        receivedFrom: '2026-09-23T00:00:00.000Z',
        receivedTo: '2026-09-22T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RentalReminderService summary day window', () => {
  const repository = {
    findTenantTimezone: jest.fn(),
    countCommunicationsSummary: jest.fn(),
  };
  const service = new RentalReminderService(repository as never, {} as never);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-22T15:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes the tenant-local day window and maps the counters', async () => {
    repository.findTenantTimezone.mockResolvedValue({
      tenant: { settings: { timeZone: 'America/Argentina/Buenos_Aires' } },
    });
    repository.countCommunicationsSummary.mockResolvedValue({
      dispatchesScheduledToday: 3,
      deliveriesSentToday: 5,
      deliveriesDeliveredToday: 4,
      deliveriesFailedToday: 2,
      planningIssuesOpen: 1,
    });

    const result = await service.getSummary('tenant-1');

    expect(result).toMatchObject({
      timeZone: 'America/Argentina/Buenos_Aires',
      window: {
        from: '2026-09-22T03:00:00.000Z',
        to: '2026-09-23T03:00:00.000Z',
      },
      dispatchesScheduledToday: 3,
      deliveriesSentToday: 5,
      deliveriesDeliveredToday: 4,
      deliveriesFailedToday: 2,
      planningIssuesOpen: 1,
    });
    expect(repository.countCommunicationsSummary).toHaveBeenCalledWith(
      'tenant-1',
      new Date('2026-09-22T03:00:00.000Z'),
      new Date('2026-09-23T03:00:00.000Z'),
    );
  });

  it('falls back to the canonical default timezone without a policy', async () => {
    repository.findTenantTimezone.mockResolvedValue(null);
    repository.countCommunicationsSummary.mockResolvedValue({
      dispatchesScheduledToday: 0,
      deliveriesSentToday: 0,
      deliveriesDeliveredToday: 0,
      deliveriesFailedToday: 0,
      planningIssuesOpen: 0,
    });

    const result = await service.getSummary('tenant-1');

    expect(result.timeZone).toBe('America/Argentina/Buenos_Aires');
    expect(result.window.from).toBe('2026-09-22T03:00:00.000Z');
  });
});

describe('RentalReminderService retryDelivery mapping', () => {
  const repository = { manualResetFailedDelivery: jest.fn() };
  const service = new RentalReminderService(repository as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a successful reset without any synchronous send', async () => {
    repository.manualResetFailedDelivery.mockResolvedValue({
      ok: true,
      attemptCount: 1,
      nextAttemptNumber: 2,
      dispatchReopened: true,
    });

    await expect(
      service.retryDelivery('tenant-1', 'delivery-1'),
    ).resolves.toEqual({
      ok: true,
      attemptCount: 1,
      nextAttemptNumber: 2,
      dispatchReopened: true,
    });
    expect(repository.manualResetFailedDelivery).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      deliveryId: 'delivery-1',
      now: expect.any(Date) as unknown,
    });
  });

  async function retryError(result: unknown) {
    repository.manualResetFailedDelivery.mockResolvedValue(result);
    return service.retryDelivery('tenant-1', 'delivery-1').then(
      () => undefined,
      (caught: unknown) => caught,
    );
  }

  it('maps NOT_FOUND to 404', async () => {
    const error = await retryError({ ok: false, reason: 'NOT_FOUND' });
    expect(error).toBeInstanceOf(NotFoundException);
    expect(
      (
        error as { getResponse: () => unknown; getStatus: () => number }
      ).getResponse(),
    ).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect((error as { getStatus: () => number }).getStatus()).toBe(404);
  });

  it.each(['NOT_FAILED', 'IN_FLIGHT', 'MAX_ATTEMPTS', 'CONCURRENT'])(
    'maps reason %s to 409 with the canonical reason',
    async (reason) => {
      const error = await retryError({ ok: false, reason });
      expect(error).toBeInstanceOf(ConflictException);
      expect(
        (
          error as { getResponse: () => unknown; getStatus: () => number }
        ).getResponse(),
      ).toEqual({ ok: false, reason });
      expect((error as { getStatus: () => number }).getStatus()).toBe(409);
    },
  );
});
