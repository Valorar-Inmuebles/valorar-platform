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

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRentalReminderPolicyDto } from './rental-reminder.dto';

describe('UpdateRentalReminderPolicyDto', () => {
  const valid = {
    preDueEnabled: true,
    preDueDays: 3,
    dueEnabled: true,
    postDueEnabled: true,
    postDueDays: 3,
    sendTimeMinutes: 600,
  };

  it('accepts the canonical defaults', async () => {
    expect(
      await validate(plainToInstance(UpdateRentalReminderPolicyDto, valid)),
    ).toHaveLength(0);
  });

  it.each([
    { preDueDays: 0 },
    { preDueDays: 31 },
    { postDueDays: 0 },
    { postDueDays: 31 },
    { sendTimeMinutes: -1 },
    { sendTimeMinutes: 1440 },
  ])('rejects an out-of-range policy value: %o', async (change) => {
    const errors = await validate(
      plainToInstance(UpdateRentalReminderPolicyDto, { ...valid, ...change }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
