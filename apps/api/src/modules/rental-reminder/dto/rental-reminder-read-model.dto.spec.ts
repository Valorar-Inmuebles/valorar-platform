jest.mock('../../../../generated/prisma/client', () => ({
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
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
  RentalReminderDeliveryStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
  },
}));

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  RentalReminderContractHistoryQueryDto,
  RentalReminderHistoryQueryDto,
  RentalReminderInboundQueryDto,
} from './rental-reminder-read-model.dto';

describe('RentalReminderContractHistoryQueryDto', () => {
  it('accepts the canonical filters', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderContractHistoryQueryDto, {
        page: 1,
        pageSize: 20,
        eventType: 'DUE',
        dispatchStatus: 'COMPLETED',
        channel: 'WHATSAPP',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each([
    { eventType: 'CUSTOM' },
    { dispatchStatus: 'CUSTOM' },
    { channel: 'FAX' },
  ])('rejects an unknown enum value: %o', async (change) => {
    const errors = await validate(
      plainToInstance(RentalReminderContractHistoryQueryDto, change),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RentalReminderHistoryQueryDto', () => {
  it('accepts a contractId filter', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderHistoryQueryDto, {
        contractId: 'contract-1',
        page: 1,
        pageSize: 20,
      }),
    );
    expect(errors).toHaveLength(0);
  });
});

describe('RentalReminderInboundQueryDto', () => {
  it('accepts contract, contact and received window filters', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderInboundQueryDto, {
        contractId: 'contract-1',
        contactId: 'contact-1',
        receivedFrom: '2026-09-22T00:00:00.000Z',
        receivedTo: '2026-09-23T00:00:00.000Z',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed received window bound', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderInboundQueryDto, {
        receivedFrom: 'not-a-date',
      }),
    );
    expect(errors.some((error) => error.property === 'receivedFrom')).toBe(
      true,
    );
  });
});
