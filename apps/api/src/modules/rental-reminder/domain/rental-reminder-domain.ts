import { createHash } from 'node:crypto';
import {
  NotificationChannel,
  RentalReminderAttemptStatus,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchStatus,
} from '../../../../generated/prisma/client';

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const OPERATIONAL_REMINDER_CHANNELS = [
  NotificationChannel.EMAIL,
  NotificationChannel.WHATSAPP,
] as const;

export function isOperationalReminderChannel(channel: NotificationChannel) {
  return OPERATIONAL_REMINDER_CHANNELS.includes(
    channel as (typeof OPERATIONAL_REMINDER_CHANNELS)[number],
  );
}

export function computeOccurrenceSetHash(occurrenceIds: readonly string[]) {
  return sha256(
    `rental-reminder-occurrence-set:v1|${[...new Set(occurrenceIds)].sort().join('|')}`,
  );
}

export function computePlanningIssueKey(input: {
  tenantId: string;
  contractId?: string | null;
  occurrenceId?: string | null;
  recipientContactId?: string | null;
  channel?: NotificationChannel | null;
  type: string;
}) {
  return sha256(
    [
      'rental-planning-issue:v1',
      input.tenantId,
      input.contractId ?? 'none',
      input.occurrenceId ?? 'none',
      input.recipientContactId ?? 'none',
      input.channel ?? 'none',
      input.type,
    ].join('|'),
  );
}

export function computeDispatchGroupKey(input: {
  tenantId: string;
  contractId: string;
  recipientContactId: string;
  eventType: string;
  dueDate: string;
}) {
  return sha256(
    [
      'rental-reminder-dispatch:v1',
      input.tenantId,
      input.contractId,
      input.recipientContactId,
      input.eventType,
      input.dueDate,
    ].join('|'),
  );
}

export function computeDeliveryKey(
  groupKey: string,
  channel: NotificationChannel,
) {
  return sha256(`rental-reminder-delivery:v1|${groupKey}|${channel}`);
}

export function computeAttemptKey(deliveryKey: string, attemptNumber: number) {
  return sha256(`rental-reminder-attempt:v1|${deliveryKey}|${attemptNumber}`);
}

const dispatchTransitions: Record<
  RentalReminderDispatchStatus,
  readonly RentalReminderDispatchStatus[]
> = {
  PLANNED: ['READY', 'SKIPPED'],
  READY: ['PROCESSING', 'SKIPPED'],
  PROCESSING: ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'SKIPPED'],
  COMPLETED: [],
  PARTIALLY_COMPLETED: [],
  FAILED: [],
  SKIPPED: [],
};

const deliveryTransitions: Record<
  RentalReminderDeliveryStatus,
  readonly RentalReminderDeliveryStatus[]
> = {
  PENDING: ['PROCESSING', 'SKIPPED'],
  PROCESSING: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'],
  SENT: ['DELIVERED', 'READ', 'FAILED'],
  DELIVERED: ['READ'],
  READ: [],
  FAILED: [],
  SKIPPED: [],
};

const attemptTransitions: Record<
  RentalReminderAttemptStatus,
  readonly RentalReminderAttemptStatus[]
> = {
  PROCESSING: ['ACCEPTED', 'FAILED'],
  ACCEPTED: [],
  FAILED: [],
};

export const canTransitionDispatch = (
  from: RentalReminderDispatchStatus,
  to: RentalReminderDispatchStatus,
) => dispatchTransitions[from].includes(to);

export const canTransitionDelivery = (
  from: RentalReminderDeliveryStatus,
  to: RentalReminderDeliveryStatus,
) => deliveryTransitions[from].includes(to);

export const canTransitionAttempt = (
  from: RentalReminderAttemptStatus,
  to: RentalReminderAttemptStatus,
) => attemptTransitions[from].includes(to);
