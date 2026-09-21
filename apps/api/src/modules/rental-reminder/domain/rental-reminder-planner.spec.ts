jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  RentalReminderEventType: {
    PRE_DUE: 'PRE_DUE',
    DUE: 'DUE',
    POST_DUE: 'POST_DUE',
  },
  RentalReminderPlanningIssueType: {
    DUE_DATE_MISSING: 'DUE_DATE_MISSING',
    DISPLAY_AMOUNT_MISSING: 'DISPLAY_AMOUNT_MISSING',
    NO_ENABLED_ROUTE: 'NO_ENABLED_ROUTE',
    CONTACT_POINT_INELIGIBLE: 'CONTACT_POINT_INELIGIBLE',
    TENANT_TIME_ZONE_MISSING_OR_INVALID: 'TENANT_TIME_ZONE_MISSING_OR_INVALID',
    PLANNING_WINDOW_EXPIRED: 'PLANNING_WINDOW_EXPIRED',
  },
}));

import {
  ContactPointType,
  NotificationChannel,
  RentalReminderEventType,
} from '../../../../generated/prisma/client';
import {
  classifyPlannerWindow,
  enabledEvents,
  eventSchedule,
  isContactPointCompatible,
  isValidTimeZone,
  localDateAt,
  nextRetryAt,
} from './rental-reminder-planner';

const policy = {
  preDueEnabled: true,
  preDueDays: 3,
  dueEnabled: true,
  postDueEnabled: true,
  postDueDays: 3,
  sendTimeMinutes: 600,
};

describe('Rental reminder planner domain', () => {
  it('converts tenant-local reminder time to UTC deterministically', () => {
    const scheduled = eventSchedule({
      eventType: RentalReminderEventType.DUE,
      dueDate: new Date('2026-10-10T00:00:00.000Z'),
      policy,
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    expect(scheduled.toISOString()).toBe('2026-10-10T13:00:00.000Z');
    expect(
      localDateAt(
        new Date('2026-10-10T02:30:00.000Z'),
        'America/Argentina/Buenos_Aires',
      ),
    ).toEqual({ year: 2026, month: 10, day: 9 });
  });

  it('honors policy toggles and custom PRE/POST days', () => {
    expect(
      enabledEvents({ ...policy, preDueEnabled: false, dueEnabled: false }),
    ).toEqual([RentalReminderEventType.POST_DUE]);
    expect(
      eventSchedule({
        eventType: RentalReminderEventType.PRE_DUE,
        dueDate: new Date('2026-10-10T00:00:00.000Z'),
        policy: { ...policy, preDueDays: 6 },
        timeZone: 'UTC',
      }).toISOString(),
    ).toBe('2026-10-04T10:00:00.000Z');
  });

  it('applies lookahead, lookback and semantic catch-up rules', () => {
    expect(
      classifyPlannerWindow({
        scheduledFor: new Date('2026-10-10T13:04:00.000Z'),
        eventType: RentalReminderEventType.DUE,
        dueDate: new Date('2026-10-10T00:00:00.000Z'),
        now: new Date('2026-10-10T13:00:00.000Z'),
        timeZone: 'America/Argentina/Buenos_Aires',
      }),
    ).toBe('DUE');
    expect(
      classifyPlannerWindow({
        scheduledFor: new Date('2026-10-09T13:00:00.000Z'),
        eventType: RentalReminderEventType.DUE,
        dueDate: new Date('2026-10-09T00:00:00.000Z'),
        now: new Date('2026-10-10T13:00:00.000Z'),
        timeZone: 'America/Argentina/Buenos_Aires',
      }),
    ).toBe('EXPIRED');
  });

  it('keeps only compatible operational destinations', () => {
    expect(
      isContactPointCompatible({
        channel: NotificationChannel.EMAIL,
        contactPointType: ContactPointType.EMAIL,
        canReceiveWhatsapp: false,
      }),
    ).toBe(true);
    expect(
      isContactPointCompatible({
        channel: NotificationChannel.WHATSAPP,
        contactPointType: ContactPointType.PHONE,
        canReceiveWhatsapp: true,
      }),
    ).toBe(true);
    expect(
      isContactPointCompatible({
        channel: NotificationChannel.SMS,
        contactPointType: ContactPointType.PHONE,
        canReceiveWhatsapp: true,
      }),
    ).toBe(false);
  });

  it('uses the fixed retry schedule and stops after attempt four', () => {
    const failedAt = new Date('2026-10-10T13:00:00.000Z');
    expect(nextRetryAt(1, failedAt)?.toISOString()).toBe(
      '2026-10-10T13:05:00.000Z',
    );
    expect(nextRetryAt(2, failedAt)?.toISOString()).toBe(
      '2026-10-10T13:30:00.000Z',
    );
    expect(nextRetryAt(3, failedAt)?.toISOString()).toBe(
      '2026-10-10T15:00:00.000Z',
    );
    expect(nextRetryAt(4, failedAt)).toBeNull();
  });

  it('rejects missing and invalid tenant time zones', () => {
    expect(isValidTimeZone('America/Argentina/Buenos_Aires')).toBe(true);
    expect(isValidTimeZone('Invalid/Zone')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });
});
