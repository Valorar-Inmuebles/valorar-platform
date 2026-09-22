jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalReminderDeliveryStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
  RentalReminderDispatchStatus: {
    PLANNED: 'PLANNED',
    READY: 'READY',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
  RentalReminderEventType: {
    PRE_DUE: 'PRE_DUE',
    DUE: 'DUE',
    POST_DUE: 'POST_DUE',
  },
  RentalReminderPlanningIssueStatus: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
  RentalReminderPlanningIssueType: { DUE_DATE_MISSING: 'DUE_DATE_MISSING' },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import {
  RentalReminderCommunicationController,
  RentalReminderPolicyController,
  RentalReminderReadController,
} from './rental-reminder.controller';

describe('RentalReminder controllers RBAC surface', () => {
  it('keeps read models under rental.read and management under rental.reminder.manage', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, RentalReminderReadController),
    ).toEqual(['rental.read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        RentalReminderCommunicationController,
      ),
    ).toEqual(['rental.reminder.manage']);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, RentalReminderPolicyController),
    ).toEqual(['rental.reminder.manage']);
  });

  it('exposes retry as a 200 POST on the manage surface', () => {
    const retryHandler = Object.getOwnPropertyDescriptor(
      RentalReminderCommunicationController.prototype,
      'retry',
    )?.value as unknown as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata('__httpCode__', retryHandler)).toBe(200);
  });
});

describe('RentalReminderReadController delegation', () => {
  const service = {
    getContractHistory: jest.fn().mockResolvedValue({ items: [] }),
    getInbound: jest.fn().mockResolvedValue({ items: [] }),
    getSummary: jest.fn().mockResolvedValue({}),
  };
  const controller = new RentalReminderReadController(service as never);

  it('delegates contract history with tenant, contract and query', async () => {
    const query = { page: 1, pageSize: 20, channel: 'WHATSAPP' as const };
    await controller.contractHistory('contract-1', 'tenant-1', query);
    expect(service.getContractHistory).toHaveBeenCalledWith(
      'tenant-1',
      'contract-1',
      query,
    );
  });

  it('delegates inbound with tenant and query', async () => {
    const query = { page: 1, pageSize: 20 };
    await controller.inbound('tenant-1', query);
    expect(service.getInbound).toHaveBeenCalledWith('tenant-1', query);
  });

  it('delegates summary with tenant', async () => {
    await controller.summary('tenant-1');
    expect(service.getSummary).toHaveBeenCalledWith('tenant-1');
  });
});

describe('RentalReminderCommunicationController retry delegation', () => {
  const service = { retryDelivery: jest.fn().mockResolvedValue({ ok: true }) };
  const controller = new RentalReminderCommunicationController(
    service as never,
  );

  it('delegates retry scoped to the current tenant', async () => {
    await controller.retry('delivery-1', 'tenant-1');
    expect(service.retryDelivery).toHaveBeenCalledWith(
      'tenant-1',
      'delivery-1',
    );
  });
});
