jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP', SMS: 'SMS' },
  Currency: { ARS: 'ARS', USD: 'USD' },
  RentalConceptSystemCode: {
    RENT: 'RENT',
    EXPENSES: 'EXPENSES',
    ELECTRICITY: 'ELECTRICITY',
    GAS: 'GAS',
    ABL: 'ABL',
    AYSA: 'AYSA',
    INSURANCE: 'INSURANCE',
  },
  RentalContractStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ENDED: 'ENDED',
    CANCELLED: 'CANCELLED',
  },
  RentalContractPartyRole: { RENTER: 'RENTER', LANDLORD: 'LANDLORD' },
  RentalObligationKind: { RECURRING: 'RECURRING', ONE_TIME: 'ONE_TIME' },
  RentalAmountMode: { FIXED: 'FIXED', VARIABLE: 'VARIABLE' },
  RentalDueMode: {
    FIXED_DAY: 'FIXED_DAY',
    MANUAL_PER_PERIOD: 'MANUAL_PER_PERIOD',
  },
  RentalOccurrenceStatus: {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
  },
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
    PROVIDER_CONFIGURATION_INVALID: 'PROVIDER_CONFIGURATION_INVALID',
    PROVIDER_TEMPLATE_INVALID: 'PROVIDER_TEMPLATE_INVALID',
    PLANNING_WINDOW_EXPIRED: 'PLANNING_WINDOW_EXPIRED',
  },
  RentalReminderPlanningIssueStatus: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
  RentalReminderDispatchOccurrenceStatus: {
    INCLUDED: 'INCLUDED',
    EXCLUDED_BEFORE_SEND: 'EXCLUDED_BEFORE_SEND',
  },
  RentalReminderStatusSource: {
    INTERNAL: 'INTERNAL',
    PROVIDER_RESPONSE: 'PROVIDER_RESPONSE',
    PROVIDER_WEBHOOK: 'PROVIDER_WEBHOOK',
  },
  RentalReminderAttemptStatus: {
    PROCESSING: 'PROCESSING',
    ACCEPTED: 'ACCEPTED',
    FAILED: 'FAILED',
  },
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
}));

import {
  computeAttemptKey,
  computeDeliveryKey,
  computeDispatchGroupKey,
  computeOccurrenceSetHash,
  computePlanningIssueKey,
} from '../domain/rental-reminder-domain';
import { buildRentalCommunicationsFixturePlan } from './rental-communications-fixture.plan';
import { hasMinimumCalendarMonth } from '../../rental-contract/utils/rental-contract-term';

const TENANT_ID = 'tenant-demo';
const ADMIN_USER_ID = 'user-admin';
const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const GEO = {
  countryId: 'country-ar',
  provinceId: 'province-caba',
  provinceName: 'Capital Federal',
  localityId: 'locality-palermo',
  localityName: 'Palermo',
};

function build(now = new Date('2026-09-23T14:30:00.000Z')) {
  return buildRentalCommunicationsFixturePlan({
    tenantId: TENANT_ID,
    adminUserId: ADMIN_USER_ID,
    now,
    timeZone: TIME_ZONE,
    geo: GEO,
  });
}

function dayMinute(plan: ReturnType<typeof build>, minutes: number) {
  const base = plan.from.getTime();
  return new Date(base + minutes * 60_000);
}

describe('buildRentalCommunicationsFixturePlan', () => {
  it('is deterministic and idempotent (same input -> deep-equal plan)', () => {
    const first = build();
    const second = build();
    expect(first).toEqual(second);
    // Re-running after cleanup produces the exact same scenario.
    expect(
      buildRentalCommunicationsFixturePlan({
        tenantId: TENANT_ID,
        adminUserId: ADMIN_USER_ID,
        now: first.now,
        timeZone: TIME_ZONE,
        geo: GEO,
      }),
    ).toEqual(first);
  });

  it('targets only the demo tenant and exposes fixture-scoped ids', () => {
    const plan = build();
    expect(plan.tenantId).toBe(TENANT_ID);
    expect(plan.adminUserId).toBe(ADMIN_USER_ID);
    const allIds = Object.values(plan.fixtureIds).flat();
    expect(allIds.length).toBeGreaterThan(0);
    expect(allIds.every((id) => id.startsWith('fx-c4c-'))).toBe(true);
    // The window is the local day [from, to) of the tenant timezone.
    expect(plan.to.getTime() - plan.from.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(plan.from.toISOString()).toBe('2026-09-23T03:00:00.000Z');
  });

  it('expects summary counts 2/3/2/1/1/2 for the local day window', () => {
    expect(build().expectedSummary).toEqual({
      dispatchesScheduledToday: 2,
      deliveriesSentToday: 3,
      deliveriesDeliveredToday: 2,
      deliveriesFailedToday: 1,
      planningIssuesOpen: 1,
      inboundUnacknowledged: 2,
    });
  });

  it('builds the ACTIVE contract ALQ-000001 with concept and party rows', () => {
    const plan = build();
    expect(plan.contract.internalNumber).toBe('ALQ-000001');
    expect(plan.contract.status).toBe('ACTIVE');
    expect(plan.contract.propertyCountryId).toBe(GEO.countryId);
    expect(plan.contract.propertyProvinceId).toBe(GEO.provinceId);
    expect(plan.contract.propertyLocalityId).toBe(GEO.localityId);
    expect(plan.contract.propertyAddressSnapshot).toBe(
      'Av. Fixture 1234, Palermo, Capital Federal',
    );
    expect(plan.contract.endsOn).toBeDefined();
    expect(plan.contract.endsOn.getTime()).toBeGreaterThan(
      plan.contract.startsOn.getTime(),
    );
    expect(
      hasMinimumCalendarMonth(plan.contract.startsOn, plan.contract.endsOn),
    ).toBe(true);
    expect(plan.contract.createdById).toBe(ADMIN_USER_ID);
    expect(plan.concepts.map((c) => c.slug).sort()).toEqual([
      'alquiler',
      'expensas',
    ]);
    expect(plan.parties).toHaveLength(2);
    expect(plan.parties.filter((p) => p.isPrimary)).toHaveLength(1);
    // Co-renter has no contact points nor routes; only the renter has routes.
    expect(plan.contactPoints).toHaveLength(2);
    expect(plan.routes).toHaveLength(2);
    expect(plan.routes.map((r) => r.contractPartyId)).toEqual([
      plan.parties[0].id,
      plan.parties[0].id,
    ]);
  });

  it('schedules both dispatches today at 10:00 local within [from, to)', () => {
    const plan = build();
    const scheduledFor = dayMinute(plan, 10 * 60);
    for (const dispatch of plan.dispatches) {
      expect(dispatch.scheduledFor.getTime()).toBe(scheduledFor.getTime());
      expect(dispatch.scheduledFor.getTime()).toBeGreaterThanOrEqual(
        plan.from.getTime(),
      );
      expect(dispatch.scheduledFor.getTime()).toBeLessThan(plan.to.getTime());
    }
    expect(plan.dispatches.map((d) => d.eventType)).toEqual(['PRE_DUE', 'DUE']);
    const statuses = plan.dispatches.map((d) => d.status);
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('PARTIALLY_COMPLETED');
    // Freeze + completion coherence required by RentalReminderDispatch_freeze_check
    // and rental_check (completedAt on terminal statuses).
    for (const dispatch of plan.dispatches) {
      expect(dispatch.frozenAt).toBeDefined();
      expect(dispatch.frozenAt.getTime()).toBe(scheduledFor.getTime());
      expect(dispatch.completedAt).toBeDefined();
    }
  });

  it('produces 4 deliveries with expected statuses, sources and providers', () => {
    const plan = build();
    expect(plan.deliveries).toHaveLength(4);
    const byChannelAndStatus = plan.deliveries.map((d) => [
      d.channel,
      d.status,
    ]);
    expect(byChannelAndStatus).toEqual([
      ['EMAIL', 'DELIVERED'],
      ['WHATSAPP', 'DELIVERED'],
      ['EMAIL', 'SENT'],
      ['WHATSAPP', 'FAILED'],
    ]);
    for (const delivery of plan.deliveries) {
      expect(delivery.statusSource).toBe('INTERNAL');
      expect(delivery.templateKey).toBe('rental-reminder');
      expect(delivery.templateVersion).toBe('1');
      expect(delivery.providerAccountKey).toBe('platform-default');
      expect(delivery.providerMessageId).toBeNull();
      expect(delivery.deliveryKey).toMatch(/^[0-9a-f]{64}$/);
    }
    const providerKeys = new Set(plan.deliveries.map((d) => d.providerKey));
    expect(providerKeys).toEqual(new Set(['mailersend', 'meta-whatsapp']));
  });

  it('makes the FAILED WhatsApp delivery retry-eligible (1 attempt < 4)', () => {
    const plan = build();
    const failed = plan.deliveries.find(
      (d) => d.channel === 'WHATSAPP' && d.status === 'FAILED',
    );
    expect(failed).toBeDefined();
    expect(failed!.attemptCount).toBe(1);
    expect(failed!.failedAt).toBeDefined();
    expect(failed!.sentAt).toBeNull();
    expect(failed!.errorCategory).toBe('FIXTURE_SIMULATED');
    expect(failed!.errorCode).toBe('FX_SIMULATED_REJECTION');
    expect(failed!.errorMessage).toContain('fixture');

    const failedAttempt = plan.attempts.find(
      (a) => a.deliveryId === failed!.id,
    );
    expect(failedAttempt?.status).toBe('FAILED');
    expect(failedAttempt?.errorCategory).toBe('FIXTURE_SIMULATED');
    // No live PROCESSING attempt is left behind.
    expect(plan.attempts.some((a) => a.status === 'PROCESSING')).toBe(false);
    expect(plan.attempts).toHaveLength(4);
    expect(
      plan.attempts.every(
        (a) =>
          a.providerMessageId === null &&
          a.attemptKey ===
            computeAttemptKey(
              plan.deliveries.find((d) => d.id === a.deliveryId)!.deliveryKey,
              a.attemptNumber,
            ),
      ),
    ).toBe(true);
  });

  it('mirrors planner snapshots and identity/group/delivery keys', () => {
    const plan = build();
    for (const dispatch of plan.dispatches) {
      expect(dispatch.recipientIdentityKey).toBe(
        `contact:${dispatch.recipientContactId}`,
      );
      expect(dispatch.recipientSnapshot).toEqual({
        contactId: dispatch.recipientContactId,
        name: 'Inquilino Fixture C4C',
      });
      expect(dispatch.policySnapshot.version).toBe(1);
      expect(dispatch.policySnapshot.timeZone).toBe(TIME_ZONE);
      expect(dispatch.policySnapshot.preDueDays).toBe(3);
      expect(dispatch.policySnapshot.sendTimeMinutes).toBe(600);
      expect(dispatch.contentSnapshot.version).toBe(1);
      expect(dispatch.contentSnapshot.renderState).toBe('PENDING_C3');
      expect(dispatch.contentSnapshot.eventType).toBe(dispatch.eventType);
      for (const occurrence of dispatch.contentSnapshot.occurrences) {
        expect(occurrence.currency).toBe('ARS');
        expect(typeof occurrence.amount).toBe('string');
      }
      expect(dispatch.groupKey).toMatch(/^[0-9a-f]{64}$/);
      expect(dispatch.occurrenceSetHash).toMatch(/^[0-9a-f]{64}$/);
    }
    const predue = plan.dispatches[0];
    expect(plan.dispatches[0].occurrenceSetHash).toBe(
      computeOccurrenceSetHash([plan.occurrences[1].id]),
    );
    expect(predue.groupKey).toBe(
      computeDispatchGroupKey({
        tenantId: TENANT_ID,
        contractId: plan.contractId,
        recipientContactId: predue.recipientContactId,
        eventType: 'PRE_DUE',
        dueDate: plan.occurrences[1].dueDate.toISOString().slice(0, 10),
      }),
    );
    const predueEmail = plan.deliveries[0];
    expect(predueEmail.deliveryKey).toBe(
      computeDeliveryKey(predue.groupKey, 'EMAIL'),
    );
  });

  it('keeps every delivery timestamp inside the local day window', () => {
    const plan = build();
    const at = (minutes: number, seconds = 0) =>
      new Date(dayMinute(plan, minutes).getTime() + seconds * 1000);
    expect(plan.deliveries[0].sentAt).toEqual(at(600, 45));
    expect(plan.deliveries[0].deliveredAt).toEqual(at(601));
    expect(plan.deliveries[1].sentAt).toEqual(at(601));
    expect(plan.deliveries[1].deliveredAt).toEqual(at(601, 30));
    expect(plan.deliveries[2].sentAt).toEqual(at(602, 30));
    expect(plan.deliveries[3].failedAt).toEqual(at(603, 30));
    for (const delivery of plan.deliveries) {
      const timestamps = [
        delivery.sentAt,
        delivery.deliveredAt,
        delivery.failedAt,
      ].filter((value): value is Date => value !== null);
      for (const value of timestamps) {
        expect(value.getTime()).toBeGreaterThanOrEqual(plan.from.getTime());
        expect(value.getTime()).toBeLessThan(plan.to.getTime());
      }
    }
  });

  it('creates one OPEN NO_ENABLED_ROUTE issue for the co-renter', () => {
    const plan = build();
    expect(plan.planningIssue.type).toBe('NO_ENABLED_ROUTE');
    expect(plan.planningIssue.status).toBe('OPEN');
    expect(plan.planningIssue.recipientContactId).toBe(
      plan.fixtureIds.contactIds[1],
    );
    expect(plan.planningIssue.occurrenceId).toBe(plan.occurrences[0].id);
    expect(plan.planningIssue.metadata).toEqual({
      reason: 'NO_ENABLED_OPERATIONAL_ROUTE',
    });
    expect(plan.planningIssue.deduplicationKey).toBe(
      computePlanningIssueKey({
        tenantId: TENANT_ID,
        contractId: plan.contractId,
        occurrenceId: plan.planningIssue.occurrenceId,
        recipientContactId: plan.planningIssue.recipientContactId,
        channel: null,
        type: 'NO_ENABLED_ROUTE',
      }),
    );
  });

  it('models inbound messages: 2 uncorrelated + 1 correlated to a real delivery', () => {
    const plan = build();
    expect(plan.inbound).toHaveLength(3);
    const [msg1, msg2, msg3] = plan.inbound;
    // Uncorrelated: the read model must never invent a correlation.
    expect(msg1.readAt).toBeNull();
    expect(msg1.acknowledgedAt).toBeNull();
    expect(msg1.acknowledgedById).toBeNull();
    expect(msg1.deliveryId).toBeNull();
    expect(msg2.readAt).toBeDefined();
    expect(msg2.acknowledgedAt).toBeDefined();
    expect(msg2.acknowledgedById).toBe(ADMIN_USER_ID);
    expect(msg2.deliveryId).toBeNull();
    // Correlated by deliveryId to the PRE_DUE WHATSAPP delivery: unread and
    // unacknowledged (feeds inboundUnacknowledged and the history responses).
    expect(msg3.deliveryId).toBe(plan.fixtureIds.deliveryIds[1]);
    expect(msg3.readAt).toBeNull();
    expect(msg3.acknowledgedAt).toBeNull();
    expect(msg3.acknowledgedById).toBeNull();
    for (const message of plan.inbound) {
      expect(message.providerMessageId).toMatch(/^fx-wamid-\d{4}$/);
      expect(message.senderAddress).toBe('+5491155550000');
      expect(message.channel).toBe('WHATSAPP');
      expect(message.metadata).toEqual({
        fixture: 'fx-c4c',
        synthetic: true,
      });
    }
    // The WhatsApp contact point normalized value equals the inbound sender.
    const whatsappPoint = plan.contactPoints.find((cp) => cp.type === 'PHONE')!;
    expect(whatsappPoint.normalizedValue).toBe('+5491155550000');
  });

  it('describes upserts (policy/tenantSetting/sequence) without deleting them', () => {
    const plan = build();
    expect(plan.policy).toEqual({
      preDueEnabled: true,
      preDueDays: 3,
      dueEnabled: true,
      postDueEnabled: true,
      postDueDays: 3,
      sendTimeMinutes: 600,
    });
    expect(plan.tenantSettingTimeZone).toBe(TIME_ZONE);
    expect(plan.sequenceLastValue).toBe(1);
  });

  it('carries no webhook receipts or provider evidence', () => {
    const plan = build();
    expect(plan).not.toHaveProperty('webhookReceipts');
    for (const delivery of plan.deliveries) {
      expect(delivery.providerMessageId).toBeNull();
    }
    for (const attempt of plan.attempts) {
      expect(attempt.providerMessageId).toBeNull();
    }
  });
});
