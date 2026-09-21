import {
  ContactPointType,
  NotificationChannel,
  RentalReminderEventType,
  RentalReminderPlanningIssueType,
} from '../../../../generated/prisma/client';

export const PLANNER_LOOKBACK_DAYS = 7;
export const PLANNER_LOOKAHEAD_MINUTES = 5;
export const MAX_REMINDER_ATTEMPTS = 4;
export const REMINDER_RETRY_DELAYS_MS = [
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
] as const;

export type LocalDate = { year: number; month: number; day: number };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = formatterCache.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, value);
  }
  return value;
}

export function isValidTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) return false;
  try {
    formatter(timeZone).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function zonedParts(value: Date, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(value);
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: numberPart('year'),
    month: numberPart('month'),
    day: numberPart('day'),
    hour: numberPart('hour'),
    minute: numberPart('minute'),
    second: numberPart('second'),
  };
}

export function localDateAt(value: Date, timeZone: string): LocalDate {
  const { year, month, day } = zonedParts(value, timeZone);
  return { year, month, day };
}

export function dateToLocalDate(value: Date): LocalDate {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

export function localDateKey(value: LocalDate) {
  return `${value.year.toString().padStart(4, '0')}-${value.month
    .toString()
    .padStart(2, '0')}-${value.day.toString().padStart(2, '0')}`;
}

export function compareLocalDates(left: LocalDate, right: LocalDate) {
  return localDateKey(left).localeCompare(localDateKey(right));
}

export function addLocalDays(value: LocalDate, days: number): LocalDate {
  const result = new Date(
    Date.UTC(value.year, value.month - 1, value.day + days),
  );
  return dateToLocalDate(result);
}

export function localDateTimeToUtc(
  date: LocalDate,
  minutesFromMidnight: number,
  timeZone: string,
) {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const targetAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute,
  );
  let candidate = targetAsUtc;

  for (let pass = 0; pass < 2; pass += 1) {
    const actual = zonedParts(new Date(candidate), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    candidate += targetAsUtc - actualAsUtc;
  }

  return new Date(candidate);
}

export type ReminderPolicyShape = {
  preDueEnabled: boolean;
  preDueDays: number;
  dueEnabled: boolean;
  postDueEnabled: boolean;
  postDueDays: number;
  sendTimeMinutes: number;
};

export function eventSchedule(input: {
  eventType: RentalReminderEventType;
  dueDate: Date;
  policy: ReminderPolicyShape;
  timeZone: string;
}) {
  const dueDate = dateToLocalDate(input.dueDate);
  const offset =
    input.eventType === RentalReminderEventType.PRE_DUE
      ? -input.policy.preDueDays
      : input.eventType === RentalReminderEventType.POST_DUE
        ? input.policy.postDueDays
        : 0;
  return localDateTimeToUtc(
    addLocalDays(dueDate, offset),
    input.policy.sendTimeMinutes,
    input.timeZone,
  );
}

export function enabledEvents(policy: ReminderPolicyShape) {
  const events: RentalReminderEventType[] = [];
  if (policy.preDueEnabled) events.push(RentalReminderEventType.PRE_DUE);
  if (policy.dueEnabled) events.push(RentalReminderEventType.DUE);
  if (policy.postDueEnabled) events.push(RentalReminderEventType.POST_DUE);
  return events;
}

export function eventRemainsSemanticallyValid(input: {
  eventType: RentalReminderEventType;
  dueDate: Date;
  now: Date;
  timeZone: string;
}) {
  const today = localDateAt(input.now, input.timeZone);
  const dueDate = dateToLocalDate(input.dueDate);
  const comparison = compareLocalDates(today, dueDate);
  if (input.eventType === RentalReminderEventType.PRE_DUE)
    return comparison < 0;
  if (input.eventType === RentalReminderEventType.DUE) return comparison === 0;
  return comparison > 0;
}

export type PlannerWindowResult = 'NOT_DUE' | 'DUE' | 'EXPIRED';

export function classifyPlannerWindow(input: {
  scheduledFor: Date;
  eventType: RentalReminderEventType;
  dueDate: Date;
  now: Date;
  timeZone: string;
}): PlannerWindowResult {
  const upper = input.now.getTime() + PLANNER_LOOKAHEAD_MINUTES * 60_000;
  if (input.scheduledFor.getTime() > upper) return 'NOT_DUE';

  const lower = input.now.getTime() - PLANNER_LOOKBACK_DAYS * 86_400_000;
  if (
    input.scheduledFor.getTime() < lower ||
    !eventRemainsSemanticallyValid(input)
  ) {
    return 'EXPIRED';
  }
  return 'DUE';
}

export function isContactPointCompatible(input: {
  channel: NotificationChannel;
  contactPointType: ContactPointType;
  canReceiveWhatsapp: boolean;
}) {
  if (input.channel === NotificationChannel.EMAIL)
    return input.contactPointType === ContactPointType.EMAIL;
  if (input.channel === NotificationChannel.WHATSAPP)
    return (
      input.contactPointType === ContactPointType.PHONE &&
      input.canReceiveWhatsapp
    );
  return false;
}

export function nextRetryAt(attemptNumber: number, failedAt: Date) {
  if (attemptNumber < 1 || attemptNumber >= MAX_REMINDER_ATTEMPTS) return null;
  return new Date(
    failedAt.getTime() + REMINDER_RETRY_DELAYS_MS[attemptNumber - 1],
  );
}

export const PLANNER_MANAGED_ISSUE_TYPES = [
  RentalReminderPlanningIssueType.DUE_DATE_MISSING,
  RentalReminderPlanningIssueType.DISPLAY_AMOUNT_MISSING,
  RentalReminderPlanningIssueType.NO_ENABLED_ROUTE,
  RentalReminderPlanningIssueType.CONTACT_POINT_INELIGIBLE,
  RentalReminderPlanningIssueType.TENANT_TIME_ZONE_MISSING_OR_INVALID,
  RentalReminderPlanningIssueType.PLANNING_WINDOW_EXPIRED,
] as const;
