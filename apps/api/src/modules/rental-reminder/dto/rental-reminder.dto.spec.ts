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
import { RentalReminderInboundQueryDto } from './rental-reminder-read-model.dto';
import {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  UpdateRentalReminderPolicyDto,
} from './rental-reminder.dto';

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

describe('RentalReminderDispatchQueryDto scheduling range', () => {
  it('accepts an inclusive/exclusive ISO-8601 scheduling window', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderDispatchQueryDto, {
        page: 2,
        pageSize: 10,
        scheduledFrom: '2026-09-01T00:00:00.000Z',
        scheduledTo: '2026-10-01T00:00:00.000Z',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each([{ scheduledFrom: 'not-a-date' }, { scheduledTo: 'not-a-date' }])(
    'rejects a malformed window bound: %o',
    async (change) => {
      const errors = await validate(
        plainToInstance(RentalReminderDispatchQueryDto, change),
      );
      expect(
        errors.some(
          (error) =>
            error.property === 'scheduledFrom' ||
            error.property === 'scheduledTo',
        ),
      ).toBe(true);
    },
  );

  it('accepts a single-sided window bound', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderDispatchQueryDto, {
        scheduledFrom: '2026-09-01T00:00:00.000Z',
      }),
    );
    expect(errors).toHaveLength(0);
  });
});

describe('RentalReminderDeliveryQueryDto contract and delivery windows', () => {
  it('accepts contractId plus all three delivery window pairs', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderDeliveryQueryDto, {
        contractId: 'contract-1',
        sentFrom: '2026-09-01T00:00:00.000Z',
        sentTo: '2026-10-01T00:00:00.000Z',
        deliveredFrom: '2026-09-01T00:00:00.000Z',
        deliveredTo: '2026-10-01T00:00:00.000Z',
        failedFrom: '2026-09-01T00:00:00.000Z',
        failedTo: '2026-10-01T00:00:00.000Z',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed delivery window bound', async () => {
    const errors = await validate(
      plainToInstance(RentalReminderDeliveryQueryDto, {
        sentFrom: 'not-a-date',
      }),
    );
    expect(errors.some((error) => error.property === 'sentFrom')).toBe(true);
  });
});

describe('RentalReminderInboundQueryDto attention filters', () => {
  it('transforms query-string booleans for unread/unacknowledged', async () => {
    const dto = plainToInstance(RentalReminderInboundQueryDto, {
      unread: 'true',
      unacknowledged: 'false',
      receivedFrom: '2026-09-22T00:00:00.000Z',
    });
    expect(dto.unread).toBe(true);
    expect(dto.unacknowledged).toBe(false);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('treats absent and non-boolean attention filters as absent (lenient, like other query DTOs)', async () => {
    for (const value of ['', 'not-a-bool', undefined]) {
      const dto = plainToInstance(RentalReminderInboundQueryDto, {
        unread: value,
        unacknowledged: value,
      });
      expect(dto.unread).toBeUndefined();
      expect(dto.unacknowledged).toBeUndefined();
      expect(await validate(dto)).toHaveLength(0);
    }
  });
});
